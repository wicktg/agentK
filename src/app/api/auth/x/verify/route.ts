import { NextRequest, NextResponse } from "next/server";
import { verifyXBioChallenge } from "@/lib/x-watcher";
import { generateDIDForHandle, generateSessionToken } from "@/lib/crypto";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";

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
    const did = generateDIDForHandle(xUser.handle);
    const sessionToken = generateSessionToken();

    // 2. Persist in Supabase if configured
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();

        // Upsert user profile
        const { data: profile } = await supabase
          .from("profiles")
          .upsert(
            {
              did,
              x_handle: xUser.handle,
              x_name: xUser.name,
              x_avatar_url: xUser.avatarUrl,
              x_bio: xUser.bio,
              x_verified: true,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "x_handle" },
          )
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
        console.warn("[Supabase] Upsert error:", dbErr);
      }
    }

    // 3. Create response and attach secure session cookies
    const userPayload = {
      handle: xUser.handle,
      name: xUser.name,
      avatarUrl: xUser.avatarUrl,
      did,
      verified: true,
      verifiedAt: new Date().toISOString(),
    };

    const response = NextResponse.json({
      success: true,
      verified: true,
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
