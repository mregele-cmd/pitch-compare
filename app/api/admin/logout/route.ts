import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete("admin_auth");
  response.cookies.delete("owner_session");
  return response;
}
