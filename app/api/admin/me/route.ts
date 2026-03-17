import { NextRequest, NextResponse } from "next/server";

export type SessionInfo =
  | { role: "admin" }
  | { role: "owner"; email: string }
  | { role: null };

export async function GET(request: NextRequest) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const inviteCode    = process.env.INVITE_CODE;

  const adminCookie = request.cookies.get("admin_auth");
  const ownerCookie = request.cookies.get("owner_session");

  if (adminPassword && adminCookie?.value === adminPassword) {
    return NextResponse.json({ role: "admin" } satisfies SessionInfo);
  }

  if (inviteCode && ownerCookie) {
    const prefix = `${inviteCode}:`;
    if (ownerCookie.value.startsWith(prefix)) {
      const email = ownerCookie.value.slice(prefix.length);
      return NextResponse.json({ role: "owner", email } satisfies SessionInfo);
    }
  }

  // No password configured (local dev) — grant admin access
  if (!adminPassword && !inviteCode) {
    return NextResponse.json({ role: "admin" } satisfies SessionInfo);
  }

  return NextResponse.json({ role: null } satisfies SessionInfo, { status: 401 });
}
