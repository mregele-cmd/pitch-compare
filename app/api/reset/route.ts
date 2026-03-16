import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST() {
  // Delete in FK-safe order: child tables first, then parents.
  // `.not("id", "is", null)` is a filter that matches every row.
  const steps: { table: string; label: string }[] = [
    { table: "votes",       label: "votes"       },
    { table: "assignments", label: "assignments"  },
    { table: "videos",      label: "videos"       },
    { table: "students",    label: "students"     },
  ];

  for (const { table, label } of steps) {
    const { error } = await supabase
      .from(table)
      .delete()
      .not("id", "is", null);

    if (error) {
      console.error(`[reset] Failed to delete ${label}:`, error.message);
      return NextResponse.json(
        { error: `Failed to delete ${label}: ${error.message}` },
        { status: 500 }
      );
    }

    console.log(`[reset] Cleared ${label}`);
  }

  console.log("[reset] System reset complete.");
  return NextResponse.json({ ok: true });
}
