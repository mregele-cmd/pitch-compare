"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart2, LayoutDashboard, Video, ArrowLeft, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";

const ROOM_RE = /^\/room\/([^/]+)/;

export default function NavBar() {
  const pathname  = usePathname();
  const router    = useRouter();
  const roomMatch = pathname.match(ROOM_RE);
  const roomId    = roomMatch?.[1] ?? null;

  const [roomName, setRoomName] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId) { setRoomName(null); return; }
    supabase
      .from("rooms")
      .select("name")
      .eq("id", roomId)
      .maybeSingle()
      .then(({ data }) => setRoomName(data?.name ?? null));
  }, [roomId]);

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }

  // ── Room-scoped nav ──────────────────────────────────────────────────────
  if (roomId) {
    const base        = `/room/${roomId}`;
    const isDashboard = pathname.includes("/dashboard");
    const tabs = [
      { href: `${base}/dashboard`,   label: "Dashboard",   icon: LayoutDashboard },
      { href: `${base}/vote`,        label: "Vote",        icon: Video           },
      { href: `${base}/leaderboard`, label: "Leaderboard", icon: BarChart2       },
    ];

    return (
      <nav className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link
              href="/rooms"
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"
            >
              <ArrowLeft className="h-4 w-4" /> All Pitch Rooms
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-sm font-semibold text-slate-800">
              {roomName ?? "Room"}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {tabs.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              );
            })}

            {/* Sign out only on the Dashboard (admin-only page) */}
            {isDashboard && (
              <>
                <div className="mx-1 h-5 w-px bg-slate-200" />
                <button
                  onClick={handleLogout}
                  title="Sign out"
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-red-600"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </>
            )}
          </div>
        </div>
      </nav>
    );
  }

  // ── Global nav ───────────────────────────────────────────────────────────
  const isRoomsPage = pathname === "/rooms";

  return (
    <nav className="border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
            <Video className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-semibold text-slate-900">
            Pitch<span className="text-indigo-600">Compare</span>
          </span>
        </Link>

        <div className="flex items-center gap-1">
          <Link
            href="/rooms"
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isRoomsPage
                ? "bg-indigo-50 text-indigo-700"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Pitch Rooms</span>
          </Link>

          {/* Sign out shown only on the /rooms admin page */}
          {isRoomsPage && (
            <>
              <div className="mx-1 h-5 w-px bg-slate-200" />
              <button
                onClick={handleLogout}
                title="Sign out"
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-red-600"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
