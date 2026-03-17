import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const inviteCode    = process.env.INVITE_CODE;

  // If neither credential is configured (local dev without .env.local), allow through.
  if (!adminPassword && !inviteCode) {
    return NextResponse.next();
  }

  const adminCookie = request.cookies.get("admin_auth");
  const ownerCookie = request.cookies.get("owner_session");

  const isAdmin = !!adminPassword && adminCookie?.value === adminPassword;
  const isOwner = !!inviteCode && !!ownerCookie &&
    ownerCookie.value.startsWith(`${inviteCode}:`);

  if (!isAdmin && !isOwner) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("from", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Protect the rooms list and individual room dashboards.
  // Vote and leaderboard are intentionally public (student-facing).
  matcher: ["/rooms", "/room/:roomId/dashboard"],
};
