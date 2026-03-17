import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createClient as createAnonClient } from "@supabase/supabase-js";

const db = createAnonClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;

  // ── Authorization ─────────────────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  const isAdmin = adminEmail && user.email === adminEmail;

  if (!isAdmin) {
    const { data: room } = await db
      .from("rooms")
      .select("owner_id")
      .eq("id", roomId)
      .maybeSingle();

    if (!room || room.owner_id !== user.id) {
      return NextResponse.json(
        { error: "You do not have permission to reset this room." },
        { status: 403 }
      );
    }
  }

  // ── Delete in FK-safe order ───────────────────────────────────────────────
  const steps = ["votes", "assignments", "videos", "students"] as const;

  for (const table of steps) {
    const { error } = await db.from(table).delete().eq("room_id", roomId);
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
