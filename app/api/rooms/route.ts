import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Session =
  | { role: "admin" }
  | { role: "owner"; email: string }
  | null;

function resolveSession(request: NextRequest): Session {
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

// GET /api/rooms — return rooms filtered by session
export async function GET(request: NextRequest) {
  const session = resolveSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let query = supabase
    .from("rooms")
    .select("id, name, access_code, creator_email, created_at")
    .order("created_at", { ascending: false });

  if (session.role === "owner") {
    query = query.eq("creator_email", session.email);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ rooms: data ?? [], session });
}

// POST /api/rooms — create a room, setting creator_email from session
export async function POST(request: NextRequest) {
  const session = resolveSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json() as { name?: string; access_code?: string };
  const name        = body.name?.trim();
  const access_code = body.access_code?.trim().toUpperCase();

  if (!name || !access_code) {
    return NextResponse.json({ error: "name and access_code are required." }, { status: 400 });
  }

  const payload: Record<string, string> = { name, access_code };
  if (session.role === "owner") {
    payload.creator_email = session.email;
  }

  const { data, error } = await supabase.from("rooms").insert(payload).select().single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ room: data });
}
