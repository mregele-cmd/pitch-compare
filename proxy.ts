import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const adminPassword = process.env.ADMIN_PASSWORD;

  // If no password is configured (local dev without .env.local), allow through.
  if (!adminPassword) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get("admin_auth");
  const isAuthenticated = !!cookie && cookie.value === adminPassword;

  if (!isAuthenticated) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("from", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Protect the rooms list and individual room dashboards.
  // Vote and leaderboard are intentionally left public (student-facing).
  matcher: ["/rooms", "/room/:roomId/dashboard"],
};
