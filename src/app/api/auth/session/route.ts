import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    // 1. Try reading readable user cookie
    const userCookie = req.cookies.get("agentk_user")?.value;
    if (userCookie) {
      try {
        const user = JSON.parse(userCookie);
        return NextResponse.json({ authenticated: true, user });
      } catch {
        // Continue to session verification
      }
    }

    // 2. Try validating session token in Supabase
    const sessionToken = req.cookies.get("agentk_session")?.value;
    if (sessionToken && isSupabaseConfigured()) {
      const supabase = getSupabaseAdmin();
      const { data: session } = await supabase
        .from("user_sessions")
        .select("profile_id, expires_at, profiles(*)")
        .eq("session_token", sessionToken)
        .single();

      if (
        session &&
        new Date(session.expires_at) > new Date() &&
        session.profiles
      ) {
        const profile = session.profiles as unknown as {
          x_handle: string;
          x_name: string;
          x_avatar_url: string;
          did: string;
          x_verified: boolean;
        };

        const userPayload = {
          handle: profile.x_handle,
          name: profile.x_name,
          avatarUrl: profile.x_avatar_url,
          did: profile.did,
          verified: profile.x_verified,
        };

        return NextResponse.json({ authenticated: true, user: userPayload });
      }
    }

    return NextResponse.json({ authenticated: false, user: null });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Session error";
    return NextResponse.json(
      { authenticated: false, error: message },
      { status: 500 },
    );
  }
}
