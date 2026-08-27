import { NextRequest, NextResponse } from "next/server";
import { loadAndValidateIdentity } from "@/lib/crypto";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const handle = (body?.handle || "").replace(/^@/, "").trim();
    const pem = (body?.pem || "").trim();
    const passphrase = (body?.passphrase || "").trim();

    if (!pem) {
      return NextResponse.json(
        { success: false, error: "identity.pem content is required." },
        { status: 400 },
      );
    }
    if (!passphrase) {
      return NextResponse.json(
        { success: false, error: "Identity passphrase is required." },
        { status: 400 },
      );
    }

    // 1. Decrypt & validate PKCS#8 PEM with passphrase and derive canonical DID
    const { did, valid } = loadAndValidateIdentity(pem, passphrase);

    // 2. Update profile in Supabase if configured
    if (handle && isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        await supabase
          .from("profiles")
          .update({ did, updated_at: new Date().toISOString() })
          .eq("x_handle", handle);
      } catch (dbErr) {
        console.warn("[Supabase] Update imported DID error:", dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      valid,
      did,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to validate identity file",
      },
      { status: 400 },
    );
  }
}
