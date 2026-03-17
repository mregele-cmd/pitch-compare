import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const inviteCode = process.env.INVITE_CODE;
  if (!inviteCode) {
    return NextResponse.json(
      { error: "Server misconfiguration: INVITE_CODE is not set." },
      { status: 500 }
    );
  }

  const { inviteCode: submitted, email } = await request.json();

  if (submitted !== inviteCode) {
    return NextResponse.json({ error: "Invalid invite code." }, { status: 401 });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const emailLower   = email.trim().toLowerCase();
  const cookieValue  = `${inviteCode}:${emailLower}`;
  const response     = NextResponse.json({ ok: true });

  response.cookies.set("owner_session", cookieValue, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge:   60 * 60 * 24 * 7, // 7 days
    path:     "/",
  });
  return response;
}
