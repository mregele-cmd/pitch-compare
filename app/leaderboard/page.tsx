"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface VideoRow {
  id: string;
  title: string;
  url: string;
  elo_rating: number;
}

interface RankedPitch {
  rank: number;
  id: string;
  title: string;
  elo: number;
  wins: number;
  losses: number;
}

const rankColors = ["text-yellow-500", "text-slate-400", "text-amber-600"];

function TrendIcon({ elo }: { elo: number }) {
  if (elo > 1200) return <TrendingUp  className="h-4 w-4 text-emerald-500" />;
  if (elo < 1200) return <TrendingDown className="h-4 w-4 text-red-400"    />;
  return              <Minus        className="h-4 w-4 text-slate-400"   />;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function LeaderboardPage() {
  const [pitches, setPitches]   = useState<RankedPitch[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  async function fetchLeaderboard() {
    setLoading(true);
    setError(null);

    const [
      { data: videos, error: vErr },
      { data: votes,  error: wErr },
    ] = await Promise.all([
      supabase
        .from("videos")
        .select("id, title, url, elo_rating")
        .order("elo_rating", { ascending: false }),
      supabase
        .from("votes")
        .select("winner_video_id, loser_video_id"),
    ]);

    if (vErr || wErr) {
      setError(vErr?.message ?? wErr?.message ?? "Failed to load leaderboard.");
      setLoading(false);
      return;
    }

    // Build win/loss maps from votes
    const winMap  = new Map<string, number>();
    const lossMap = new Map<string, number>();
    votes?.forEach(({ winner_video_id, loser_video_id }) => {
      winMap.set(winner_video_id,  (winMap.get(winner_video_id)  ?? 0) + 1);
      lossMap.set(loser_video_id,  (lossMap.get(loser_video_id)  ?? 0) + 1);
    });

    const ranked: RankedPitch[] = (videos ?? []).map((v: VideoRow, i) => ({
      rank:   i + 1,
      id:     v.id,
      title:  v.title,
      elo:    v.elo_rating,
      wins:   winMap.get(v.id)  ?? 0,
      losses: lossMap.get(v.id) ?? 0,
    }));

    setPitches(ranked);
    setLastUpdated(new Date());
    setLoading(false);
  }

  useEffect(() => { fetchLeaderboard(); }, []);

  // ── Loading skeleton ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-sm">Loading rankings…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
        <button
          onClick={fetchLeaderboard}
          className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:border-slate-400"
        >
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      </div>
    );
  }

  if (pitches.length === 0) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-slate-400">
        <Trophy className="h-10 w-10 opacity-30" />
        <p className="text-sm font-medium">No videos yet — add pitches on the Professor Dashboard.</p>
      </div>
    );
  }

  const topThree = pitches.slice(0, 3);

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Leaderboard</h1>
          <p className="mt-1 text-slate-600">
            Live Elo rankings — updated after every student vote.
          </p>
        </div>
        <button
          onClick={fetchLeaderboard}
          className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-slate-400 hover:text-slate-900"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {/* Podium — top 3 */}
      <div className={`grid gap-4 ${topThree.length === 1 ? "sm:grid-cols-1 max-w-xs" : topThree.length === 2 ? "sm:grid-cols-2 max-w-lg" : "sm:grid-cols-3"}`}>
        {topThree.map((p) => (
          <div
            key={p.id}
            className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <Trophy className={`h-8 w-8 ${rankColors[p.rank - 1] ?? "text-slate-300"}`} />
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              #{p.rank}
            </span>
            <h2 className="text-center text-lg font-bold text-slate-900">{p.title}</h2>
            <div className="mt-1 rounded-full bg-indigo-50 px-3 py-1 text-sm font-bold text-indigo-700">
              {p.elo} Elo
            </div>
            <div className="text-xs text-slate-400">
              {p.wins}W &nbsp;/&nbsp; {p.losses}L
            </div>
          </div>
        ))}
      </div>

      {/* Full table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-3 text-left">Rank</th>
              <th className="px-5 py-3 text-left">Pitch</th>
              <th className="px-5 py-3 text-right">Elo</th>
              <th className="px-5 py-3 text-center">W / L</th>
              <th className="px-5 py-3 text-center">vs Baseline</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pitches.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-5 py-3 font-medium text-slate-500">
                  <span className={p.rank <= 3 ? rankColors[p.rank - 1] : ""}>
                    #{p.rank}
                  </span>
                </td>
                <td className="px-5 py-3 font-semibold text-slate-900">{p.title}</td>
                <td className="px-5 py-3 text-right font-bold text-indigo-700">{p.elo}</td>
                <td className="px-5 py-3 text-center text-slate-500">
                  {p.wins} / {p.losses}
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-center gap-1">
                    <TrendIcon elo={p.elo} />
                    <span className={`text-xs font-medium ${
                      p.elo > 1200
                        ? "text-emerald-600"
                        : p.elo < 1200
                        ? "text-red-400"
                        : "text-slate-400"
                    }`}>
                      {p.elo > 1200 ? `+${p.elo - 1200}` : p.elo < 1200 ? `${p.elo - 1200}` : "—"}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {lastUpdated && (
        <p className="text-center text-xs text-slate-400">
          Last updated {lastUpdated.toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}
