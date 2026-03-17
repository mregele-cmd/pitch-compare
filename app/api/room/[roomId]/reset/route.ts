import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function resolveSession(request: NextRequest): Promise<
  | { role: "admin" }
  | { role: "owner"; email: string }
  | null
> {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const inviteCode    = process.env.INVITE_CODE;

  const adminCookie = request.cookies.get("admin_auth");
  const ownerCookie = request.cookies.get("owner_session");

  if (adminPassword && adminCookie?.value === adminPassword) return { role: "admin" };
  if (!adminPassword && !inviteCode) return { role: "admin" }; // local dev fallback

  if (inviteCode && ownerCookie) {
    const prefix = `${inviteCode}:`;
    if (ownerCookie.value.startsWith(prefix)) {
      return { role: "owner", email: ownerCookie.value.slice(prefix.length) };
    }
  }
  return null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;

  // ── Authorization check ───────────────────────────────────────────────────
  const session = await resolveSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (session.role === "owner") {
    const { data: room } = await supabase
      .from("rooms")
      .select("creator_email")
      .eq("id", roomId)
      .maybeSingle();

    if (!room || room.creator_email !== session.email) {
      return NextResponse.json(
        { error: "You do not have permission to reset this room." },
        { status: 403 }
      );
    }
  }

  // ── Delete in FK-safe order, scoped to this room only ────────────────────
  const steps = ["votes", "assignments", "videos", "students"] as const;

  for (const table of steps) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq("room_id", roomId);

    if (error) {
      console.error(`[reset/${roomId}] Failed to delete ${table}:`, error.message);
      return NextResponse.json(
        { error: `Failed to delete ${table}: ${error.message}` },
        { status: 500 }
      );
    }
    console.log(`[reset/${roomId}] Cleared ${table}`);
  }

  console.log(`[reset/${roomId}] Room data cleared.`);
  return NextResponse.json({ ok: true });
}
