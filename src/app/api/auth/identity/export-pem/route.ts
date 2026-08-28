import { NextRequest, NextResponse } from "next/server";
import { exportOriginalPemFromVault } from "@/lib/crypto";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const passphrase = (body?.passphrase || "").trim();

    if (!passphrase) {
      return NextResponse.json(
        { success: false, error: "Identity passphrase is required." },
        { status: 400 },
      );
    }

    // 1. Resolve user handle from session / cookie / body
    let handle = (body?.handle || "").replace(/^@/, "").trim();
    if (!handle) {
      const userCookie = req.cookies.get("agentk_user")?.value;
      if (userCookie) {
        try {
          const u = JSON.parse(userCookie);
          handle = u.handle || "";
        } catch {}
      }
    }

    if (!handle) {
      return NextResponse.json(
        { success: false, error: "Unauthorized session. Please log in." },
        { status: 401 },
      );
    }

    let encryptedSigningKey: string | null = null;
    let did: string = "";

    // 2. Fetch encrypted signing key from Supabase
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data: profile } = await supabase
          .from("profiles")
          .select("did, encrypted_signing_key")
          .ilike("x_handle", handle)
          .maybeSingle();

        if (profile) {
          encryptedSigningKey = profile.encrypted_signing_key;
          did = profile.did;
        }
      } catch (err) {
        console.warn("[Supabase] Failed to fetch profile for export:", err);
      }
    }

    if (!encryptedSigningKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No encrypted identity key found in vault. Please provision your Agent ID.",
        },
        { status: 404 },
      );
    }

    // 3. Decrypt Layer 2 (Cloud Vault) and validate Layer 1 (Passphrase) to recover exact original identity.pem
    const result = exportOriginalPemFromVault(encryptedSigningKey, passphrase);

    return NextResponse.json({
      success: true,
      did: result.did || did,
      pem: result.pem,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to decrypt and export identity key.",
      },
      { status: 500 },
    );
  }
}
