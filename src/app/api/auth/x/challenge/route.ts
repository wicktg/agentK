import { NextRequest, NextResponse } from "next/server";
import { generateVerificationCode } from "@/lib/crypto";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const handle = (body?.handle || "").replace(/^@/, "").trim();

    if (!handle) {
      return NextResponse.json(
        { success: false, error: "Username handle is required." },
        { status: 400 },
      );
    }

    // Generate unique verification string
    const code = generateVerificationCode(handle);

    // Save to Supabase if configured
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        await supabase.from("verification_codes").insert({
          handle,
          code,
          status: "pending",
          expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        });
      } catch (dbErr) {
        console.warn("[Supabase] Failed to insert verification code:", dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      handle,
      code,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: `Failed to generate challenge: ${message}` },
      { status: 500 },
    );
  }
}
