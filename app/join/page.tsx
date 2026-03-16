"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Hash, Loader2, AlertCircle } from "lucide-react";

export default function JoinPage() {
  const router = useRouter();
  const [code, setCode]       = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function handleJoin(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data: room, error: roomErr } = await supabase
      .from("rooms")
      .select("id")
      .eq("access_code", code.trim().toUpperCase())
      .maybeSingle();

    if (roomErr || !room) {
      setError("No room found with that code. Please double-check and try again.");
      setLoading(false);
      return;
    }

    router.push(`/room/${room.id}/vote`);
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-900">Join a Room</h1>
        <p className="mt-2 text-slate-600">
          Enter the access code your professor gave you.
        </p>
      </div>

      <form onSubmit={handleJoin} className="flex w-full max-w-xs flex-col gap-4">
        <div className="relative">
          <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="e.g. MKTG26"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            required
            autoFocus
            maxLength={12}
            className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-4 font-mono text-sm uppercase tracking-widest focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Finding room…</> : "Enter Room"}
        </button>
      </form>
    </div>
  );
}
