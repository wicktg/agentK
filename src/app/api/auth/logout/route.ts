import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set("agentk_session", "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
  });
  response.cookies.set("agentk_user", "", {
    maxAge: 0,
    path: "/",
  });
  return response;
}
