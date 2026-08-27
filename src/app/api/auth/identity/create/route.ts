import { NextRequest, NextResponse } from "next/server";
import { createAgentIdentity } from "@/lib/crypto";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const handle = (body?.handle || "").replace(/^@/, "").trim();
    const passphrase = (body?.passphrase || "").trim();

    if (!passphrase || passphrase.length < 12) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Identity passphrase must be at least 12 characters long (13 characters recommended).",
        },
        { status: 400 },
      );
    }

    // 1. Generate Ed25519 identity, PKCS#8 AES-256-CBC PEM, and canonical did:key:z6Mk...
    const { did, pem } = createAgentIdentity(passphrase);

    // 2. Update DID in Supabase if configured
    if (handle && isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        await supabase
          .from("profiles")
          .update({ did, updated_at: new Date().toISOString() })
          .eq("x_handle", handle);
      } catch (dbErr) {
        console.warn("[Supabase] Update DID error:", dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      did,
      pem,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to create agent identity",
      },
      { status: 500 },
    );
  }
}
