import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;

  // Delete in FK-safe order, scoped to this room only
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
