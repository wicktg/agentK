import { NextRequest, NextResponse } from "next/server";
import { generateVerificationCode } from "@/lib/crypto";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import { isUserWhitelisted } from "@/lib/supabase/whitelist";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const handle = (body?.handle || "").replace(/^@/, "").trim().toLowerCase();

    if (!handle) {
      return NextResponse.json(
        { success: false, error: "Username handle is required." },
        { status: 400 },
      );
    }

    // 1. Whitelist Verification
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

    let code: string | null = null;
    let isExisting = false;
    let userName: string | undefined;

    // Check if user already exists in Supabase
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();

        // 1. Check profiles table for this handle
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id, did, encrypted_signing_key, x_handle, x_name, x_bio")
          .ilike("x_handle", handle)
          .maybeSingle();

        if (
          existingProfile &&
          (existingProfile.encrypted_signing_key || existingProfile.did)
        ) {
          isExisting = true;
          userName = existingProfile.x_name || handle;
        }

        // 2. Check verification_codes table for any existing code (matching handle or x_handle)
        const { data: existingCodes } = await supabase
          .from("verification_codes")
          .select("*")
          .or(`handle.ilike.${handle},x_handle.ilike.${handle}`)
          .order("created_at", { ascending: false });

        if (existingCodes && existingCodes.length > 0) {
          code = existingCodes[0].code;
          isExisting = true;
          console.log(
            `[Auth Challenge] Existing user @${handle} detected. Reusing existing code: ${code}`,
          );
        } else if (existingProfile?.x_bio) {
          const bioMatch = existingProfile.x_bio.match(
            /agentk-verify:[a-zA-Z0-9_\-]+/,
          );
          if (bioMatch) {
            code = bioMatch[0];
            isExisting = true;
          }
        }
      } catch (dbErr) {
        console.warn(
          "[Supabase] Failed to lookup existing verification code:",
          dbErr,
        );
      }
    }

    // If no existing verification code was found, generate a fresh code and persist it
    if (!code) {
      code = generateVerificationCode(handle);

      if (isSupabaseConfigured()) {
        try {
          const supabase = getSupabaseAdmin();
          await supabase.from("verification_codes").insert({
            handle,
            x_handle: handle,
            code,
            status: "pending",
          });
        } catch (insertErr) {
          console.warn(
            "[Supabase] Failed to insert new verification code:",
            insertErr,
          );
        }
      }
    }

    return NextResponse.json({
      success: true,
      handle,
      code,
      isExisting,
      name: userName,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: `Failed to generate challenge: ${message}` },
      { status: 500 },
    );
  }
}
