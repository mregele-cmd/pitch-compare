"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ThumbsUp, Loader2, CheckCircle, AlertCircle,
  PartyPopper, Info, RotateCcw,
} from "lucide-react";

// Two well-known, educator-favourite pitch/presentation videos.
// Simon Sinek — "How great leaders inspire action" (TED, 18 min)
// Daniel Pink — "The puzzle of motivation" (TED, 18 min)
// Both have been on YouTube for 15+ years and serve as excellent pitch exemplars.
const DEMO_VIDEOS = [
  {
    id: "demo-v1",
    title: "GreenBrew Co. — Sustainable Coffee Subscription",
    url:   "https://www.youtube.com/watch?v=qp0HIF3SfI4",  // Simon Sinek TED
    elo_rating: 1200,
    author_emails: null,
  },
  {
    id: "demo-v2",
    title: "NovaMed — AI-Powered Diagnostic Tool",
    url:   "https://www.youtube.com/watch?v=rrkrvAUbU9Y",  // Dan Pink TED
    elo_rating: 1100,
    author_emails: null,
  },
] as const;

type DemoScreen = "voting" | "submitting" | "done";

function embedUrl(url: string) {
  const m = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : url;
}

export default function VoteDemo() {
  const [screen, setScreen]   = useState<DemoScreen>("voting");
  const [selected, setSelected] = useState<"video1" | "video2" | null>(null);
  const [winner, setWinner]   = useState<string | null>(null);

  const video1 = DEMO_VIDEOS[0];
  const video2 = DEMO_VIDEOS[1];

  function handleSubmit() {
    if (!selected) return;
    setWinner(selected === "video1" ? video1.title : video2.title);
    setScreen("submitting");
    // Simulate a brief network delay, then show the success screen
    setTimeout(() => setScreen("done"), 1200);
  }

  function handleReset() {
    setScreen("voting");
    setSelected(null);
    setWinner(null);
  }

  // ── Done / simulated success ───────────────────────────────────────────────
  if (screen === "done") {
    return (
      <div className="flex flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
            <PartyPopper className="h-10 w-10 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-3xl font-bold text-slate-900">Comparison Simulated!</h3>
            <p className="mt-2 max-w-lg text-slate-600">
              You chose <strong className="text-slate-900">{winner}</strong>.
              In a live room, this would update the Elo leaderboard in real-time for
              all participants.
            </p>
          </div>

          {/* Simulated Elo update */}
          <div className="w-full max-w-sm rounded-2xl border border-indigo-200 bg-indigo-50 p-5 text-left">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-500">
              What would have happened
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-700 truncate mr-2">{video1.title}</span>
                <span className={`shrink-0 font-mono font-semibold ${selected === "video1" ? "text-emerald-600" : "text-red-500"}`}>
                  {selected === "video1" ? "+18 pts" : "−18 pts"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-700 truncate mr-2">{video2.title}</span>
                <span className={`shrink-0 font-mono font-semibold ${selected === "video2" ? "text-emerald-600" : "text-red-500"}`}>
                  {selected === "video2" ? "+18 pts" : "−18 pts"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 rounded-xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-600 hover:border-slate-400"
            >
              <RotateCcw className="h-4 w-4" /> Try Again
            </button>
            <Link
              href="/admin/signup"
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Launch your first Pitch Room →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Voting screen (pixel-perfect match to production) ─────────────────────
  const isSubmitting = screen === "submitting";

  return (
    <div className="flex flex-col gap-6">
      {/* Header — mirrors production exactly */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold text-slate-900">Student Voting</h3>
          <p className="mt-1 text-slate-600">
            Hi Demo User — watch both pitches, then choose the stronger one.
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-sm font-medium text-slate-700">0 / 1 complete</span>
          <div className="h-2 w-36 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-indigo-500 transition-all duration-500" style={{ width: "0%" }} />
          </div>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        <Info className="h-4 w-4 shrink-0" />
        Watch each pitch in full before voting. Your choice is final and anonymous.
      </div>

      {/* Sandbox notice */}
      <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <strong>Demo mode:</strong>&nbsp;no data will be saved. This is a live preview of the student experience.
      </div>

      {/* Video cards — exact same classes as production */}
      <div className="grid gap-6 lg:grid-cols-2">
        {(["video1", "video2"] as const).map((slot) => {
          const video      = slot === "video1" ? video1 : video2;
          const isSelected = selected === slot;
          const isOther    = selected !== null && selected !== slot;
          return (
            <div
              key={slot}
              className={`flex flex-col gap-4 rounded-2xl border-2 bg-white p-5 shadow-sm transition-all ${
                isSelected
                  ? "border-indigo-500 shadow-lg shadow-indigo-100"
                  : isOther
                  ? "border-slate-200 opacity-50"
                  : "border-slate-200 hover:border-indigo-300"
              }`}
            >
              <h2 className="text-lg font-bold text-slate-900">{video.title}</h2>
              <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-slate-900">
                <iframe
                  src={embedUrl(video.url)}
                  title={video.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  allowFullScreen
                  className="absolute inset-0 h-full w-full"
                />
              </div>
              <button
                onClick={() => !isSubmitting && setSelected(slot)}
                disabled={isSubmitting}
                className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all disabled:cursor-not-allowed ${
                  isSelected
                    ? "bg-indigo-600 text-white hover:bg-indigo-700"
                    : "border border-slate-300 bg-white text-slate-700 hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-40"
                }`}
              >
                <ThumbsUp className="h-4 w-4" />
                {isSelected ? "Selected ✓" : "Choose this pitch"}
              </button>
            </div>
          );
        })}
      </div>

      {/* Submit button */}
      <div className="flex justify-center">
        <button
          onClick={handleSubmit}
          disabled={!selected || isSubmitting}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-10 py-3 text-base font-semibold text-white shadow hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isSubmitting
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
            : <><CheckCircle className="h-4 w-4" /> Submit Vote</>}
        </button>
      </div>
    </div>
  );
}
