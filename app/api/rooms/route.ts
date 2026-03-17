import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

// GET /api/rooms — return rooms filtered by the authenticated user
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  const isAdmin = adminEmail && user.email === adminEmail;

  let query = supabase
    .from("rooms")
    .select("id, name, access_code, owner_id, created_at")
    .order("created_at", { ascending: false });

  if (!isAdmin) {
    query = query.eq("owner_id", user.id);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const role = isAdmin ? "admin" : "professor";
  return NextResponse.json({ rooms: data ?? [], session: { role, email: user.email, id: user.id } });
}

// POST /api/rooms — create a room owned by the authenticated user
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json() as { name?: string; access_code?: string };
  const name        = body.name?.trim();
  const access_code = body.access_code?.trim().toUpperCase();

  if (!name || !access_code) {
    return NextResponse.json({ error: "name and access_code are required." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("rooms")
    .insert({ name, access_code, owner_id: user.id })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ room: data });
}
