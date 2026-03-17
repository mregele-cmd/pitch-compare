import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return NextResponse.json({ error: "Server misconfiguration: ADMIN_PASSWORD is not set." }, { status: 500 });
  }

  const { password } = await request.json();
  if (password !== adminPassword) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("admin_auth", adminPassword, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge:   60 * 60 * 24 * 7, // 7 days
    path:     "/",
  });
  return response;
}
