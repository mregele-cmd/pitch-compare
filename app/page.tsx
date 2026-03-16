"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Hash, Loader2, AlertCircle, Video, ArrowRight, Users } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [code, setCode]       = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function handleJoin(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data: room } = await supabase
      .from("rooms")
      .select("id")
      .eq("access_code", code.trim().toUpperCase())
      .maybeSingle();

    if (!room) {
      setError("No Pitch Room found with that code. Please check and try again.");
      setLoading(false);
      return;
    }

    router.push(`/room/${room.id}/vote`);
  }

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-10 py-12">
      {/* Branding */}
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg">
          <Video className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">
          Pitch<span className="text-indigo-600">Compare</span>
        </h1>
        <p className="mt-3 text-slate-500">
          Pairwise pitch evaluation powered by Elo ratings.
        </p>
      </div>

      {/* Gatekeeper */}
      <div className="w-full max-w-sm">
        <form onSubmit={handleJoin} className="flex flex-col gap-4">
          <div className="relative">
            <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Enter Pitch Room Code"
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
            className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Finding room…</>
              : <>Enter Pitch Room <ArrowRight className="h-4 w-4" /></>}
          </button>
        </form>

        <div className="mt-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-xs text-slate-400">or</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <Link
          href="/rooms"
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 py-3 text-sm font-medium text-slate-700 hover:border-slate-400 hover:bg-slate-50"
        >
          <Users className="h-4 w-4" /> Professor / Admin Login
        </Link>
      </div>
    </div>
  );
}
