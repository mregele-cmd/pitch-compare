"use client";

import { useState, FormEvent, useEffect, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { calcNewElos } from "@/lib/elo";
import { toEmbedUrl } from "@/lib/embedUrl";
import {
  ThumbsUp, Loader2, CheckCircle, AlertCircle,
  PartyPopper, BarChart2, Info, Mail, Video,
} from "lucide-react";

type Screen = "email" | "loading" | "voting" | "submitting" | "done";

interface VideoSlot  { id: string; title: string; url: string; elo_rating: number; author_emails: string | null; }
interface ActiveAssignment { id: string; video1: VideoSlot; video2: VideoSlot; }
interface Student    { id: string; name: string; email: string; }

export default function RoomVotePage() {
  return (
    <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>}>
      <VoteInner />
    </Suspense>
  );
}

function VoteInner() {
  const { roomId }       = useParams<{ roomId: string }>();
  const searchParams     = useSearchParams();
  const studentIdParam   = searchParams.get("studentId");

  const [screen, setScreen]                   = useState<Screen>("email");
  const [emailInput, setEmailInput]           = useState("");
  const [student, setStudent]                 = useState<Student | null>(null);
  const [assignment, setAssignment]           = useState<ActiveAssignment | null>(null);
  const [selected, setSelected]               = useState<"video1" | "video2" | null>(null);
  const [completedCount, setCompletedCount]   = useState(0);
  const [totalCount, setTotalCount]           = useState(0);
  const [myPitch, setMyPitch]                 = useState<VideoSlot | null>(null);
  const [error, setError]                     = useState<string | null>(null);

  // Auto-login via magic link
  useEffect(() => {
    if (!studentIdParam) return;
    async function autoLogin() {
      setScreen("loading");
      const { data: rows } = await supabase
        .from("students")
        .select("id, name, email")
        .eq("id", studentIdParam)
        .eq("room_id", roomId)
        .limit(1);

      if (!rows?.length) {
        setError("This link appears to be invalid or expired. Please enter your email instead.");
        setScreen("email");
        return;
      }
      await loadStudent(rows[0] as Student);
    }
    autoLogin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentIdParam, roomId]);

  async function loadStudent(s: Student) {
    setStudent(s);
    const emailLower = s.email.toLowerCase();

    const [{ count: total }, { count: completed }, { data: allVideos }] = await Promise.all([
      supabase.from("assignments").select("*", { count: "exact", head: true }).eq("student_id", s.id),
      supabase.from("assignments").select("*", { count: "exact", head: true }).eq("student_id", s.id).eq("status", "completed"),
      supabase.from("videos").select("id,title,url,elo_rating,author_emails").eq("room_id", roomId),
    ]);
    setTotalCount(total ?? 0);
    setCompletedCount(completed ?? 0);

    // Find the student's own pitch (if they are listed as an author)
    const own = (allVideos ?? []).find((v) => {
      if (!v.author_emails) return false;
      return v.author_emails
        .split(/[;,]\s*/)
        .map((e: string) => e.trim().toLowerCase())
        .includes(emailLower);
    });
    setMyPitch((own as VideoSlot) ?? null);

    await fetchNextAssignment(s.id, s.email);
  }

  /** Returns true if the student is listed as an author of the given video. */
  function isOwnVideo(v: VideoSlot, studentEmail: string): boolean {
    if (!v.author_emails) return false;
    return v.author_emails
      .split(/[;,]\s*/)
      .map((e) => e.trim().toLowerCase())
      .includes(studentEmail.toLowerCase());
  }

  async function fetchNextAssignment(studentId: string, studentEmail: string): Promise<void> {
    const { data, error: fetchError } = await supabase
      .from("assignments")
      .select(`id, video1:videos!assignments_video_1_id_fkey(id,title,url,elo_rating,author_emails), video2:videos!assignments_video_2_id_fkey(id,title,url,elo_rating,author_emails)`)
      .eq("student_id", studentId)
      .eq("status", "pending")
      .limit(1)
      .maybeSingle();

    if (fetchError) { setError("Could not load your next assignment. Please refresh."); return; }
    if (!data) { setScreen("done"); return; }

    const v1 = data.video1 as unknown as VideoSlot;
    const v2 = data.video2 as unknown as VideoSlot;

    // Safety check: if this assignment contains a video the student authored,
    // auto-skip it (mark completed without a vote) and fetch the next one.
    if (isOwnVideo(v1, studentEmail) || isOwnVideo(v2, studentEmail)) {
      await supabase.from("assignments").update({ status: "completed" }).eq("id", data.id);
      await fetchNextAssignment(studentId, studentEmail);
      return;
    }

    setAssignment({ id: data.id, video1: v1, video2: v2 });
    setSelected(null);
    setScreen("voting");
  }

  async function handleEmailSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setScreen("loading");

    const { data: rows } = await supabase
      .from("students")
      .select("id, name, email")
      .eq("email", emailInput.trim().toLowerCase())
      .eq("room_id", roomId)
      .limit(1);

    if (!rows?.length) {
      setError("No student found with that email in this room. Please check and try again.");
      setScreen("email");
      return;
    }
    await loadStudent(rows[0] as Student);
  }

  async function handleSubmitVote() {
    if (!selected || !assignment || !student) return;
    setScreen("submitting");

    const winner = selected === "video1" ? assignment.video1 : assignment.video2;
    const loser  = selected === "video1" ? assignment.video2 : assignment.video1;
    const { newWinnerElo, newLoserElo } = calcNewElos(winner.elo_rating, loser.elo_rating);

    const [r1, r2, r3, r4] = await Promise.all([
      supabase.from("assignments").update({ status: "completed" }).eq("id", assignment.id),
      supabase.from("votes").insert({ student_id: student.id, winner_video_id: winner.id, loser_video_id: loser.id, room_id: roomId }),
      supabase.from("videos").update({ elo_rating: newWinnerElo }).eq("id", winner.id),
      supabase.from("videos").update({ elo_rating: newLoserElo  }).eq("id", loser.id),
    ]);

    if (r1.error ?? r2.error ?? r3.error ?? r4.error) {
      setError("Your vote could not be saved. Please refresh and try again.");
      setScreen("voting");
      return;
    }

    setCompletedCount((c) => c + 1);
    await fetchNextAssignment(student.id, student.email);
  }

  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // ── Email screen ──────────────────────────────────────────────────────────
  if (screen === "email" || screen === "loading") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-900">Student Voting</h1>
          <p className="mt-2 text-slate-600">Enter your university email to load your assignments.</p>
        </div>
        <form onSubmit={handleEmailSubmit} className="flex w-full max-w-sm flex-col gap-4">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              placeholder="you@university.edu"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              required autoFocus disabled={screen === "loading"}
              className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
            />
          </div>
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />{error}
            </div>
          )}
          <button type="submit" disabled={screen === "loading"}
            className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
            {screen === "loading"
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Looking up your account…</>
              : "Start Voting"}
          </button>
        </form>
      </div>
    );
  }

  // ── Done screen ───────────────────────────────────────────────────────────
  if (screen === "done") {
    return (
      <div className="flex flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
            <PartyPopper className="h-10 w-10 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">You&apos;re all done!</h1>
            <p className="mt-2 text-slate-600">
              Great work, {student?.name?.split(" ")[0]}. You&apos;ve completed all{" "}
              <strong>{totalCount}</strong> of your assigned comparisons.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href={`/room/${roomId}/leaderboard`}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700">
              <BarChart2 className="h-4 w-4" /> View Leaderboard
            </Link>
            <button onClick={() => { setScreen("email"); setEmailInput(""); setStudent(null); setMyPitch(null); setError(null); }}
              className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-600 hover:border-slate-400">
              Switch Account
            </button>
          </div>
        </div>

        {/* My Pitch — shown on done screen */}
        {myPitch && (
          <div className="w-full max-w-xl rounded-2xl border border-indigo-200 bg-indigo-50 p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Video className="h-5 w-5 text-indigo-600" />
              <h2 className="text-base font-semibold text-indigo-900">Your Pitch</h2>
            </div>
            <p className="mb-3 text-sm font-medium text-indigo-800">{myPitch.title}</p>
            <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-slate-900">
              <iframe key={myPitch.id} src={toEmbedUrl(myPitch.url)} title={myPitch.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen className="absolute inset-0 h-full w-full" />
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Voting screen ─────────────────────────────────────────────────────────
  if ((screen === "voting" || screen === "submitting") && assignment) {
    const isSubmitting = screen === "submitting";
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Student Voting</h1>
            <p className="mt-1 text-slate-600">
              Hi {student?.name?.split(" ")[0]} — watch both pitches, then choose the stronger one.
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className="text-sm font-medium text-slate-700">{completedCount} / {totalCount} complete</span>
            <div className="h-2 w-36 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-indigo-500 transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <Info className="h-4 w-4 shrink-0" />
          Watch each pitch in full before voting. Your choice is final and anonymous.
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />{error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {(["video1", "video2"] as const).map((slot) => {
            const video      = assignment[slot];
            const isSelected = selected === slot;
            const isOther    = selected !== null && selected !== slot;
            return (
              <div key={slot} className={`flex flex-col gap-4 rounded-2xl border-2 bg-white p-5 shadow-sm transition-all ${isSelected ? "border-indigo-500 shadow-lg shadow-indigo-100" : isOther ? "border-slate-200 opacity-50" : "border-slate-200 hover:border-indigo-300"}`}>
                <h2 className="text-lg font-bold text-slate-900">{video.title}</h2>
                <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-slate-900">
                  <iframe key={video.id} src={toEmbedUrl(video.url)} title={video.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    allowFullScreen className="absolute inset-0 h-full w-full" />
                </div>
                <button onClick={() => !isSubmitting && setSelected(slot)} disabled={isSubmitting}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all disabled:cursor-not-allowed ${isSelected ? "bg-indigo-600 text-white hover:bg-indigo-700" : "border border-slate-300 bg-white text-slate-700 hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-40"}`}>
                  <ThumbsUp className="h-4 w-4" />
                  {isSelected ? "Selected ✓" : "Choose this pitch"}
                </button>
              </div>
            );
          })}
        </div>

        {/* My Pitch — shown on voting screen as a reminder */}
        {myPitch && (
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Video className="h-5 w-5 text-indigo-600" />
              <h2 className="text-base font-semibold text-indigo-900">Your Pitch</h2>
              <span className="ml-auto text-xs text-indigo-500">You are not judged on this one</span>
            </div>
            <p className="mb-3 text-sm font-medium text-indigo-800">{myPitch.title}</p>
            <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-slate-900">
              <iframe key={myPitch.id} src={toEmbedUrl(myPitch.url)} title={myPitch.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen className="absolute inset-0 h-full w-full" />
            </div>
          </div>
        )}

        <div className="flex justify-center">
          <button onClick={handleSubmitVote} disabled={!selected || isSubmitting}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-10 py-3 text-base font-semibold text-white shadow hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40">
            {isSubmitting
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
              : <><CheckCircle className="h-4 w-4" /> Submit Vote</>}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
