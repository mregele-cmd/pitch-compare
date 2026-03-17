import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ role: null }, { status: 401 });
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  const role = adminEmail && user.email === adminEmail ? "admin" : "professor";

  return NextResponse.json({ role, email: user.email, id: user.id });
}
