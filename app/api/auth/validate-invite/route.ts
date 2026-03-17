import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json() as { inviteCode?: string };
  const inviteCode = process.env.INVITE_CODE;

  if (!inviteCode) {
    // No invite code configured — allow signup (local dev)
    return NextResponse.json({ ok: true });
  }

  if (!body.inviteCode || body.inviteCode.trim() !== inviteCode) {
    return NextResponse.json(
      { error: "Invalid invite code. Please contact the administrator." },
      { status: 403 }
    );
  }

  return NextResponse.json({ ok: true });
}
