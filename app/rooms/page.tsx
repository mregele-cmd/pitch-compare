"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  Plus,
  LayoutDashboard,
  Loader2,
  AlertCircle,
  Lock,
  Calendar,
  X,
} from "lucide-react";

interface Room {
  id: string;
  name: string;
  access_code: string | null;
  created_at: string;
}

export default function RoomsPage() {
  const [rooms, setRooms]         = useState<Room[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [newName, setNewName]     = useState("");
  const [newCode, setNewCode]     = useState("");
  const [creating, setCreating]   = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  async function fetchRooms() {
    const { data } = await supabase
      .from("rooms")
      .select("id, name, access_code, created_at")
      .order("created_at", { ascending: false });
    setRooms(data ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchRooms(); }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);

    const payload: { name: string; access_code?: string } = { name: newName.trim() };
    if (newCode.trim()) payload.access_code = newCode.trim().toUpperCase();

    const { error } = await supabase.from("rooms").insert(payload);
    if (error) {
      setCreateError(error.message);
      setCreating(false);
      return;
    }

    setNewName("");
    setNewCode("");
    setShowForm(false);
    setCreating(false);
    fetchRooms();
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Class Rooms</h1>
          <p className="mt-1 text-slate-600">
            Each room is a self-contained grading session for one class or semester.
          </p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setCreateError(null); }}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Cancel" : "New Room"}
        </button>
      </div>

      {/* Create room form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="flex flex-col gap-4 rounded-2xl border border-indigo-200 bg-indigo-50 p-6"
        >
          <h2 className="text-base font-semibold text-slate-900">Create a New Room</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Room Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Spring 2026 — MKTG 300"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Access Code <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. MKTG26"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                maxLength={12}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono uppercase focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <p className="mt-1 text-xs text-slate-500">
                Students use this code to find the room on the Join page.
              </p>
            </div>
          </div>

          {createError && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" /> {createError}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={creating}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {creating ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</> : <><Plus className="h-4 w-4" /> Create Room</>}
            </button>
          </div>
        </form>
      )}

      {/* Room list */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : rooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 py-20 text-slate-400">
          <LayoutDashboard className="h-10 w-10 opacity-40" />
          <p className="text-sm font-medium">No rooms yet — create your first one above.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <Link
              key={room.id}
              href={`/room/${room.id}/dashboard`}
              className="group flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-indigo-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-base font-semibold text-slate-900 leading-snug group-hover:text-indigo-700">
                  {room.name}
                </h2>
                <LayoutDashboard className="h-5 w-5 shrink-0 text-slate-300 group-hover:text-indigo-400" />
              </div>

              <div className="flex flex-col gap-1.5">
                {room.access_code && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Lock className="h-3.5 w-3.5" />
                    Code: <span className="font-mono font-semibold text-slate-700">{room.access_code}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Calendar className="h-3.5 w-3.5" />
                  Created {new Date(room.created_at).toLocaleDateString()}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
