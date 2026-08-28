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

    // 1. Generate Ed25519 identity, PKCS#8 PEM, canonical DID, and AES-256-GCM vault envelope
    const { did, pem, encryptedSigningKey } = createAgentIdentity(passphrase);

    // 2. Persist DID and encrypted vault envelope in Supabase
    if (handle && isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        await supabase.from("profiles").upsert(
          {
            x_handle: handle,
            did,
            encrypted_signing_key: encryptedSigningKey,
            x_verified: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "x_handle" },
        );
      } catch (dbErr) {
        console.warn("[Supabase] Upsert DID/vault error:", dbErr);
      }
    }

    const response = NextResponse.json({
      success: true,
      did,
      pem,
    });

    // Update user cookie with new DID
    const userCookie = req.cookies.get("agentk_user")?.value;
    if (userCookie) {
      try {
        const u = JSON.parse(userCookie);
        u.did = did;
        response.cookies.set("agentk_user", JSON.stringify(u), {
          httpOnly: false,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 30 * 24 * 60 * 60,
          path: "/",
        });
      } catch {}
    }

    return response;
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
