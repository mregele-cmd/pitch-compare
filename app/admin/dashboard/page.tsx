"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import {
  Plus, LayoutDashboard, Loader2, AlertCircle,
  Lock, Calendar, X, RefreshCw, Copy, Check,
} from "lucide-react";

interface Room {
  id: string;
  name: string;
  access_code: string | null;
  owner_id: string | null;
  created_at: string;
}

type Session = {
  role: "admin" | "professor";
  email: string;
  id: string;
} | null;

/** Generate a random 6-character uppercase alphanumeric code (no confusable chars). */
function generateCode(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

export default function AdminDashboardPage() {
  const [session, setSession]               = useState<Session>(null);
  const [rooms, setRooms]                   = useState<Room[]>([]);
  const [loading, setLoading]               = useState(true);
  const [showForm, setShowForm]             = useState(false);
  const [newName, setNewName]               = useState("");
  const [newCode, setNewCode]               = useState("");
  const [creating, setCreating]             = useState(false);
  const [createError, setCreateError]       = useState<string | null>(null);
  const [copiedId, setCopiedId]             = useState<string | null>(null);

  useEffect(() => { fetchRooms(); }, []);

  async function fetchRooms() {
    setLoading(true);
    const res = await fetch("/api/rooms");
    if (res.ok) {
      const data = await res.json() as { rooms: Room[]; session: Session };
      setSession(data.session);
      setRooms(data.rooms);
    }
    setLoading(false);
  }

  function openForm() {
    setNewName(""); setNewCode(generateCode()); setCreateError(null); setShowForm(true);
  }
  function closeForm() {
    setShowForm(false); setNewName(""); setNewCode(""); setCreateError(null);
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);

    const res = await fetch("/api/rooms", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ name: newName.trim(), access_code: newCode.trim().toUpperCase() }),
    });

    if (!res.ok) {
      const data = await res.json() as { error?: string };
      setCreateError(
        (data.error ?? "").includes("unique")
          ? "That access code is already in use. Please choose a different one."
          : (data.error ?? "Failed to create room.")
      );
      setCreating(false);
      return;
    }

    closeForm();
    setCreating(false);
    fetchRooms();
  }

  function copyCode(id: string, code: string) {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Pitch Rooms</h1>
          <p className="mt-1 text-slate-600">
            {session?.role === "admin"
              ? "All Pitch Rooms (admin view)."
              : `Rooms for ${session?.email ?? "you"}.`}
          </p>
        </div>
        <button
          onClick={showForm ? closeForm : openForm}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Cancel" : "New Pitch Room"}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="flex flex-col gap-4 rounded-2xl border border-indigo-200 bg-indigo-50 p-6"
        >
          <h2 className="text-base font-semibold text-slate-900">Create a New Pitch Room</h2>
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
                Access Code <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  type="text"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                  required
                  maxLength={12}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono uppercase tracking-widest focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setNewCode(generateCode())}
                  title="Generate a new code"
                  className="flex shrink-0 items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:border-slate-400"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Students enter this code on the homepage to join.
              </p>
            </div>
          </div>

          {createError && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" /> {createError}
            </div>
          )}

          <button
            type="submit"
            disabled={creating}
            className="flex w-fit items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {creating
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</>
              : <><Plus className="h-4 w-4" /> Create Pitch Room</>}
          </button>
        </form>
      )}

      {/* Room list */}
      {rooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 py-20 text-slate-400">
          <LayoutDashboard className="h-10 w-10 opacity-40" />
          <p className="text-sm font-medium">No Pitch Rooms yet — create your first one above.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <div
              key={room.id}
              className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-base font-semibold leading-snug text-slate-900">
                  {room.name}
                </h2>
                <Link
                  href={`/room/${room.id}/dashboard`}
                  className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"
                  title="Open Dashboard"
                >
                  <LayoutDashboard className="h-4 w-4" />
                </Link>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-slate-400" />
                  <span className="font-mono text-lg font-bold tracking-widest text-slate-900">
                    {room.access_code ?? "—"}
                  </span>
                </div>
                {room.access_code && (
                  <button
                    onClick={() => copyCode(room.id, room.access_code!)}
                    title="Copy code"
                    className="rounded p-1 text-slate-400 hover:text-indigo-600"
                  >
                    {copiedId === room.id
                      ? <Check className="h-4 w-4 text-emerald-500" />
                      : <Copy className="h-4 w-4" />}
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Calendar className="h-3.5 w-3.5" />
                  Created {new Date(room.created_at).toLocaleDateString()}
                </div>
                <Link
                  href={`/room/${room.id}/dashboard`}
                  className="text-xs font-medium text-indigo-600 hover:underline"
                >
                  Open Dashboard →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
