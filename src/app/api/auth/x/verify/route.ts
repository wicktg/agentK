import { NextRequest, NextResponse } from "next/server";
import { verifyXBioChallenge } from "@/lib/x-watcher";
import { generateSessionToken, generateDIDForHandle } from "@/lib/crypto";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import { isUserWhitelisted } from "@/lib/supabase/whitelist";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const handle = (body?.handle || "").replace(/^@/, "").trim();
    const code = (body?.code || "").trim();

    if (!handle || !code) {
      return NextResponse.json(
        {
          success: false,
          error: "Both handle and verification code are required.",
        },
        { status: 400 },
      );
    }

    // Whitelist Verification
    if (isSupabaseConfigured()) {
      const whitelisted = await isUserWhitelisted(handle);
      if (!whitelisted) {
        return NextResponse.json(
          {
            success: false,
            notWhitelisted: true,
            error: "You are not whitelisted to use agentK.",
          },
          { status: 403 },
        );
      }
    }

    // 1. Execute live watcher bio verification
    const verification = await verifyXBioChallenge(handle, code);

    if (!verification.verified || !verification.user) {
      return NextResponse.json(
        {
          success: false,
          verified: false,
          error:
            verification.error ||
            `Verification code was not found in @${handle}'s X bio. Please check your bio and try again.`,
        },
        { status: 400 },
      );
    }

    const xUser = verification.user;
    const sessionToken = generateSessionToken();
    let isExistingUser = false;
    let hasIdentity = false;
    let did = "";

    // 2. Persist in Supabase if configured
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();

        // Check if user already exists in profiles with an established identity
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id, did, encrypted_signing_key, x_handle, x_verified")
          .ilike("x_handle", xUser.handle)
          .maybeSingle();

        if (existingProfile && existingProfile.encrypted_signing_key) {
          did = existingProfile.did || "";
          isExistingUser = true;
          hasIdentity = true;
          console.log(
            `[Auth Verify] Returning existing user @${xUser.handle} with established DID: ${did}`,
          );
        } else {
          isExistingUser = false;
          hasIdentity = false;
          // Provide provisional DID so database not-null constraint is never violated
          did = existingProfile?.did || generateDIDForHandle(xUser.handle);
          console.log(
            `[Auth Verify] New user @${xUser.handle} detected. Routing to Agent ID setup.`,
          );
        }

        // Upsert user profile
        const upsertPayload: Record<string, any> = {
          x_handle: xUser.handle,
          x_name: xUser.name,
          x_avatar_url: xUser.avatarUrl,
          x_bio: xUser.bio,
          x_verified: true,
          did: did,
          updated_at: new Date().toISOString(),
        };

        const { data: profile } = await supabase
          .from("profiles")
          .upsert(upsertPayload, { onConflict: "x_handle" })
          .select()
          .single();

        // Update verification code status
        await supabase
          .from("verification_codes")
          .update({ status: "verified", verified_at: new Date().toISOString() })
          .eq("code", code);

        // Store session token
        if (profile?.id) {
          await supabase.from("user_sessions").insert({
            session_token: sessionToken,
            profile_id: profile.id,
            expires_at: new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000,
            ).toISOString(),
          });
        }
      } catch (dbErr) {
        console.warn("[Supabase] Upsert error during verification:", dbErr);
      }
    }

    // 3. Create response and attach secure session cookies
    const userPayload = {
      handle: xUser.handle,
      name: xUser.name,
      avatarUrl: xUser.avatarUrl,
      did: did || "",
      verified: true,
      verifiedAt: new Date().toISOString(),
    };

    const response = NextResponse.json({
      success: true,
      verified: true,
      isExistingUser,
      hasIdentity,
      user: userPayload,
    });

    // Set secure HTTP-only session cookie
    response.cookies.set("agentk_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
    });

    // Set readable user identity cookie for client synchronization
    response.cookies.set("agentk_user", JSON.stringify(userPayload), {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Verification error";
    return NextResponse.json(
      { success: false, error: `Verification failed: ${message}` },
      { status: 500 },
    );
  }
}
