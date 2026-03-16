"use client";

import { useState, useRef, useEffect, DragEvent, ChangeEvent } from "react";
import Papa from "papaparse";
import { supabase } from "@/lib/supabase";
import { buildAssignments } from "@/lib/assignmentEngine";
import {
  Upload,
  Video,
  Shuffle,
  BarChart2,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  FileText,
  Loader2,
  X,
  Plus,
  ExternalLink,
  Trash2,
  Info,
  Mail,
  Download,
  RotateCcw,
  TriangleAlert,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

type UploadStatus = "idle" | "parsing" | "inserting" | "success" | "error";
type ActionStatus = "idle" | "loading" | "success" | "error";

interface ParsedStudent {
  name: string;
  email: string;
}

interface ImportResult {
  inserted: number;
  skipped: number;
  errors: string[];
}

interface VideoRow {
  id: string;
  title: string;
  url: string;
  elo_rating: number;
}

interface GenerateResult {
  assignments: number;
  students: number;
  clampedTo?: number;
}

// ── Tabs ───────────────────────────────────────────────────────────────────────

const tabs = [
  { id: "upload",      label: "Upload Roster", icon: Upload   },
  { id: "videos",      label: "Videos",        icon: Video    },
  { id: "assignments", label: "Assignments",   icon: Shuffle  },
  { id: "progress",    label: "Progress",      icon: BarChart2 },
];

// ── CSV template helper ────────────────────────────────────────────────────────

function downloadTemplate() {
  const csv = "Name,Email\nJane Smith,jane@university.edu\nJohn Doe,john@university.edu\n";
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "roster_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("upload");

  // ── Roster upload state ────────────────────────────────────────────────────
  const [fileName, setFileName]         = useState<string | null>(null);
  const [parsedRows, setParsedRows]     = useState<ParsedStudent[]>([]);
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isDragging, setIsDragging]     = useState(false);
  const fileInputRef                    = useRef<HTMLInputElement>(null);

  // ── Video management state ─────────────────────────────────────────────────
  const [videos, setVideos]             = useState<VideoRow[]>([]);
  const [videosLoading, setVideosLoading] = useState(false);
  const [newTitle, setNewTitle]         = useState("");
  const [newUrl, setNewUrl]             = useState("");
  const [addStatus, setAddStatus]       = useState<ActionStatus>("idle");
  const [addError, setAddError]         = useState<string | null>(null);
  const [deletingId, setDeletingId]     = useState<string | null>(null);

  // ── Assignment generation state ───────────────────────────────────────────
  const [comparisonsPerStudent, setComparisonsPerStudent] = useState(5);
  const [genStatus, setGenStatus]       = useState<ActionStatus>("idle");
  const [genResult, setGenResult]       = useState<GenerateResult | null>(null);
  const [genError, setGenError]         = useState<string | null>(null);

  // ── Email sending state ───────────────────────────────────────────────────
  const [emailStatus, setEmailStatus]   = useState<ActionStatus>("idle");
  const [emailSent, setEmailSent]       = useState<number | null>(null);
  const [emailError, setEmailError]     = useState<string | null>(null);

  // ── Semester maintenance state ────────────────────────────────────────────
  const [exportingLeaderboard, setExportingLeaderboard] = useState(false);
  const [exportingVotes, setExportingVotes]             = useState(false);
  const [showResetConfirm, setShowResetConfirm]         = useState(false);
  const [resetStatus, setResetStatus]                   = useState<ActionStatus>("idle");
  const [resetError, setResetError]                     = useState<string | null>(null);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const [studentCount, setStudentCount] = useState<number | null>(null);
  const [assignmentCount, setAssignmentCount] = useState<number | null>(null);

  // ── Fetch helpers ──────────────────────────────────────────────────────────

  async function fetchVideos() {
    setVideosLoading(true);
    const { data, error } = await supabase
      .from("videos")
      .select("id, title, url, elo_rating")
      .order("title");
    if (!error && data) setVideos(data);
    setVideosLoading(false);
  }

  async function fetchStats() {
    const [{ count: sc }, { count: ac }] = await Promise.all([
      supabase.from("students").select("*", { count: "exact", head: true }),
      supabase.from("assignments").select("*", { count: "exact", head: true }),
    ]);
    setStudentCount(sc ?? 0);
    setAssignmentCount(ac ?? 0);
  }

  useEffect(() => {
    fetchVideos();
    fetchStats();
  }, []);

  // ── CSV upload handlers ────────────────────────────────────────────────────

  function processFile(file: File) {
    if (!file.name.endsWith(".csv")) {
      setUploadStatus("error");
      setImportResult({ inserted: 0, skipped: 0, errors: ["Please upload a .csv file."] });
      return;
    }
    setFileName(file.name);
    setUploadStatus("parsing");
    setImportResult(null);
    setParsedRows([]);
    setParseWarnings([]);

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const warnings: string[] = [];
        const rows: ParsedStudent[] = [];
        results.data.forEach((row, i) => {
          const n: Record<string, string> = {};
          for (const k of Object.keys(row)) n[k.trim().toLowerCase()] = row[k].trim();
          const name  = n["name"]  ?? "";
          const email = n["email"] ?? "";
          if (!name || !email) {
            warnings.push(`Row ${i + 2}: missing name or email — skipped.`);
            return;
          }
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            warnings.push(`Row ${i + 2}: "${email}" is not a valid email — skipped.`);
            return;
          }
          rows.push({ name, email });
        });
        setParseWarnings(warnings);
        setParsedRows(rows);
        setUploadStatus("idle");
      },
      error(err) {
        setUploadStatus("error");
        setImportResult({ inserted: 0, skipped: 0, errors: [err.message] });
      },
    });
  }

  function handleFileInput(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  function clearFile() {
    setFileName(null);
    setParsedRows([]);
    setParseWarnings([]);
    setUploadStatus("idle");
    setImportResult(null);
  }

  async function handleImport() {
    if (!parsedRows.length) return;
    setUploadStatus("inserting");
    setImportResult(null);
    const { data, error } = await supabase
      .from("students")
      .upsert(parsedRows, { onConflict: "email", ignoreDuplicates: true })
      .select();
    if (error) {
      setUploadStatus("error");
      setImportResult({ inserted: 0, skipped: parsedRows.length, errors: [error.message] });
      return;
    }
    const inserted = data?.length ?? 0;
    setUploadStatus("success");
    setImportResult({ inserted, skipped: parsedRows.length - inserted, errors: [] });
    fetchStats();
  }

  // ── Video management handlers ──────────────────────────────────────────────

  async function handleAddVideo(e: React.FormEvent) {
    e.preventDefault();
    const title = newTitle.trim();
    const url   = newUrl.trim();
    if (!title || !url) return;

    setAddStatus("loading");
    setAddError(null);

    const { error } = await supabase.from("videos").insert({ title, url });
    if (error) {
      setAddStatus("error");
      setAddError(error.message);
      return;
    }
    setAddStatus("success");
    setNewTitle("");
    setNewUrl("");
    await fetchVideos();
    await fetchStats();
    // Reset success indicator after a moment
    setTimeout(() => setAddStatus("idle"), 2000);
  }

  async function handleDeleteVideo(id: string) {
    setDeletingId(id);
    await supabase.from("videos").delete().eq("id", id);
    setVideos((prev) => prev.filter((v) => v.id !== id));
    setDeletingId(null);
    fetchStats();
  }

  // ── Assignment generation ──────────────────────────────────────────────────

  async function handleGenerateAssignments() {
    setGenStatus("loading");
    setGenResult(null);
    setGenError(null);

    // Fetch fresh students and videos
    const [{ data: students, error: sErr }, { data: vids, error: vErr }] =
      await Promise.all([
        supabase.from("students").select("id"),
        supabase.from("videos").select("id"),
      ]);

    if (sErr || vErr) {
      setGenStatus("error");
      setGenError(sErr?.message ?? vErr?.message ?? "Failed to fetch data.");
      return;
    }
    if (!students?.length) {
      setGenStatus("error");
      setGenError("No students found. Upload a roster first.");
      return;
    }
    if (!vids || vids.length < 2) {
      setGenStatus("error");
      setGenError("At least 2 videos are required to generate assignments.");
      return;
    }

    // Run the algorithm
    const { assignments, clampedTo, error: algError } = buildAssignments(
      students,
      vids,
      comparisonsPerStudent
    );

    if (algError) {
      setGenStatus("error");
      setGenError(algError);
      return;
    }

    // Wipe existing pending assignments then bulk-insert the new ones
    const { error: delError } = await supabase
      .from("assignments")
      .delete()
      .eq("status", "pending");

    if (delError) {
      setGenStatus("error");
      setGenError("Could not clear old pending assignments: " + delError.message);
      return;
    }

    // Insert in chunks of 500 to stay within Supabase row limits
    const CHUNK = 500;
    for (let i = 0; i < assignments.length; i += CHUNK) {
      const { error: insError } = await supabase
        .from("assignments")
        .insert(assignments.slice(i, i + CHUNK));
      if (insError) {
        setGenStatus("error");
        setGenError("Insertion failed: " + insError.message);
        return;
      }
    }

    setGenStatus("success");
    setGenResult({ assignments: assignments.length, students: students.length, clampedTo });
    fetchStats();
  }

  // ── Email sending ─────────────────────────────────────────────────────────

  async function handleSendEmails() {
    setEmailStatus("loading");
    setEmailSent(null);
    setEmailError(null);

    try {
      const res = await fetch("/api/send-emails", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setEmailStatus("error");
        setEmailError(json.error ?? "Unknown error from email API.");
        return;
      }
      setEmailStatus("success");
      setEmailSent(json.sent ?? json.total ?? 0);
    } catch (err) {
      setEmailStatus("error");
      setEmailError(err instanceof Error ? err.message : "Network error.");
    }
  }

  // ── CSV helper ────────────────────────────────────────────────────────────

  function downloadCsv(filename: string, headers: string[], rows: (string | number)[]) {
    const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const content = [headers.map(escape).join(","), ...rows].join("\n");
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Export leaderboard ────────────────────────────────────────────────────

  async function handleExportLeaderboard() {
    setExportingLeaderboard(true);

    const [{ data: vids }, { data: votes }] = await Promise.all([
      supabase.from("videos").select("id, title, elo_rating").order("elo_rating", { ascending: false }),
      supabase.from("votes").select("winner_video_id, loser_video_id"),
    ]);

    const winMap  = new Map<string, number>();
    const lossMap = new Map<string, number>();
    votes?.forEach(({ winner_video_id, loser_video_id }) => {
      winMap.set(winner_video_id,  (winMap.get(winner_video_id)  ?? 0) + 1);
      lossMap.set(loser_video_id,  (lossMap.get(loser_video_id)  ?? 0) + 1);
    });

    const rows = (vids ?? []).map((v, i) =>
      [i + 1, v.title, v.elo_rating, winMap.get(v.id) ?? 0, lossMap.get(v.id) ?? 0, v.elo_rating - 1200]
        .map(String)
        .join(",")
    );

    downloadCsv(
      `leaderboard_${new Date().toISOString().slice(0, 10)}.csv`,
      ["Rank", "Title", "Elo Rating", "Wins", "Losses", "vs Baseline"],
      rows as unknown as (string | number)[]
    );

    setExportingLeaderboard(false);
  }

  // ── Export raw votes ──────────────────────────────────────────────────────

  async function handleExportVotes() {
    setExportingVotes(true);

    const { data: votes } = await supabase
      .from("votes")
      .select(`
        created_at,
        student:students(email),
        winner:videos!votes_winner_video_id_fkey(title),
        loser:videos!votes_loser_video_id_fkey(title)
      `)
      .order("created_at", { ascending: true });

    const rows = (votes ?? []).map((v) => {
      const student = v.student as unknown as { email: string } | null;
      const winner  = v.winner  as unknown as { title: string } | null;
      const loser   = v.loser   as unknown as { title: string } | null;
      return [
        new Date(v.created_at).toLocaleString(),
        student?.email  ?? "",
        winner?.title   ?? "",
        loser?.title    ?? "",
      ].map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",");
    });

    downloadCsv(
      `votes_raw_${new Date().toISOString().slice(0, 10)}.csv`,
      ["Timestamp", "Student Email", "Winner Title", "Loser Title"],
      rows as unknown as (string | number)[]
    );

    setExportingVotes(false);
  }

  // ── Reset system ──────────────────────────────────────────────────────────

  async function handleReset() {
    setResetStatus("loading");
    setResetError(null);

    try {
      const res  = await fetch("/api/reset", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setResetStatus("error");
        setResetError(json.error ?? "Reset failed.");
        return;
      }
      setResetStatus("success");
      setShowResetConfirm(false);
      // Refresh counts
      setStudentCount(0);
      setVideos([]);
      setAssignmentCount(0);
    } catch (err) {
      setResetStatus("error");
      setResetError(err instanceof Error ? err.message : "Network error.");
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Professor Dashboard</h1>
        <p className="mt-1 text-slate-600">
          Manage your class roster, add pitch videos, and generate comparison assignments.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Students",    value: studentCount  ?? "—", sub: "enrolled"  },
          { label: "Videos",      value: videos.length,         sub: "pitches"   },
          { label: "Assignments", value: assignmentCount ?? "—", sub: "total"   },
          { label: "Default Elo", value: "1,200",               sub: "starting" },
        ].map(({ label, value, sub }) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
            <p className="text-xs text-slate-500">{sub}</p>
          </div>
        ))}
      </div>

      {/* Tab panel */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Tab bar */}
        <div className="flex overflow-x-auto border-b border-slate-200">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex shrink-0 items-center gap-2 px-5 py-3 text-sm font-medium transition-colors ${
                activeTab === id
                  ? "border-b-2 border-indigo-600 text-indigo-600"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="p-6">

          {/* ── Upload Roster ──────────────────────────────────────────────── */}
          {activeTab === "upload" && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Upload Student Roster</h2>
                <p className="mt-1 text-sm text-slate-600">
                  CSV must have a{" "}
                  <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">Name</code> column and
                  an{" "}
                  <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">Email</code> column.
                  Column order and extra columns don't matter.
                </p>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => !fileName && fileInputRef.current?.click()}
                className={`relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-12 transition-colors ${
                  isDragging
                    ? "border-indigo-500 bg-indigo-50"
                    : fileName
                    ? "cursor-default border-emerald-400 bg-emerald-50"
                    : "border-slate-300 bg-slate-50 hover:border-indigo-400 hover:bg-indigo-50"
                }`}
              >
                {fileName ? (
                  <>
                    <FileText className="h-8 w-8 text-emerald-500" />
                    <p className="text-sm font-medium text-slate-700">{fileName}</p>
                    <p className="text-xs text-slate-500">
                      {parsedRows.length} valid student{parsedRows.length !== 1 ? "s" : ""} found
                    </p>
                    <button
                      onClick={(e) => { e.stopPropagation(); clearFile(); }}
                      className="absolute right-3 top-3 rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-slate-400" />
                    <div className="text-center">
                      <p className="text-sm font-medium text-slate-700">
                        Drop your CSV here or{" "}
                        <span className="text-indigo-600 underline">click to browse</span>
                      </p>
                      <p className="text-xs text-slate-500">CSV files only</p>
                    </div>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="sr-only"
                  onChange={handleFileInput}
                />
              </div>

              {/* Parse warnings */}
              {parseWarnings.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="mb-1 text-sm font-semibold text-amber-800">
                    {parseWarnings.length} row{parseWarnings.length !== 1 ? "s" : ""} skipped
                  </p>
                  <ul className="list-disc space-y-0.5 pl-5 text-xs text-amber-700">
                    {parseWarnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              )}

              {/* Preview table */}
              {parsedRows.length > 0 && uploadStatus !== "success" && (
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-2 text-left">#</th>
                        <th className="px-4 py-2 text-left">Name</th>
                        <th className="px-4 py-2 text-left">Email</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedRows.slice(0, 5).map((s, i) => (
                        <tr key={i}>
                          <td className="px-4 py-2 text-slate-400">{i + 1}</td>
                          <td className="px-4 py-2 font-medium text-slate-900">{s.name}</td>
                          <td className="px-4 py-2 text-slate-500">{s.email}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsedRows.length > 5 && (
                    <p className="bg-slate-50 px-4 py-2 text-xs text-slate-400">
                      …and {parsedRows.length - 5} more
                    </p>
                  )}
                </div>
              )}

              {/* Result banners */}
              {uploadStatus === "success" && importResult && (
                <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-semibold">Import complete!</p>
                    <p>
                      {importResult.inserted} student
                      {importResult.inserted !== 1 ? "s" : ""} added
                      {importResult.skipped > 0
                        ? `, ${importResult.skipped} already existed (skipped)`
                        : ""}.
                    </p>
                  </div>
                </div>
              )}
              {uploadStatus === "error" && importResult && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-semibold">Import failed</p>
                    {importResult.errors.map((e, i) => <p key={i}>{e}</p>)}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleImport}
                  disabled={
                    !parsedRows.length ||
                    uploadStatus === "inserting" ||
                    uploadStatus === "success"
                  }
                  className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {uploadStatus === "inserting" && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {uploadStatus === "inserting" ? "Importing…" : "Import Roster"}
                </button>
                <button
                  onClick={downloadTemplate}
                  className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-slate-400 hover:text-slate-900"
                >
                  <FileText className="h-4 w-4" />
                  Download Template
                </button>
              </div>
            </div>
          )}

          {/* ── Videos ────────────────────────────────────────────────────────── */}
          {activeTab === "videos" && (
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Manage Pitch Videos</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Add YouTube, Vimeo, or Google Drive share links. Videos are assigned to
                  students during the Assignments step.
                </p>
              </div>

              {/* Add video form */}
              <form
                onSubmit={handleAddVideo}
                className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <h3 className="text-sm font-semibold text-slate-700">Add a Video</h3>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    type="text"
                    placeholder="Video title (e.g. EcoCart Pitch)"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    required
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <input
                    type="url"
                    placeholder="Video URL"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    required
                    className="flex-[2] rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={addStatus === "loading"}
                    className="flex shrink-0 items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {addStatus === "loading" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : addStatus === "success" ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    {addStatus === "loading" ? "Adding…" : addStatus === "success" ? "Added!" : "Add Video"}
                  </button>
                </div>
                {addError && (
                  <p className="flex items-center gap-1 text-xs text-red-600">
                    <AlertCircle className="h-3.5 w-3.5" /> {addError}
                  </p>
                )}
              </form>

              {/* Video list */}
              {videosLoading ? (
                <div className="flex items-center justify-center py-10 text-slate-400">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : videos.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-12 text-slate-400">
                  <Video className="h-8 w-8" />
                  <p className="text-sm">No videos yet — add your first pitch above.</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3 text-left">Title</th>
                        <th className="px-4 py-3 text-left">URL</th>
                        <th className="px-4 py-3 text-right">Elo</th>
                        <th className="px-4 py-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {videos.map((v) => (
                        <tr key={v.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-900">{v.title}</td>
                          <td className="max-w-xs px-4 py-3">
                            <a
                              href={v.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 truncate text-indigo-600 hover:underline"
                            >
                              <span className="truncate">{v.url}</span>
                              <ExternalLink className="h-3 w-3 shrink-0" />
                            </a>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-slate-600">
                            {v.elo_rating}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => handleDeleteVideo(v.id)}
                              disabled={deletingId === v.id}
                              className="rounded p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
                              title="Delete video"
                            >
                              {deletingId === v.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── Assignments ───────────────────────────────────────────────────── */}
          {activeTab === "assignments" && (
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Generate Comparison Assignments
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Configure how many pairs each student must compare, then generate all
                  assignments at once. The algorithm ensures every video receives a roughly
                  equal share of comparisons.
                </p>
              </div>

              {/* Config card */}
              <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50 p-5">
                <div className="max-w-xs">
                  <label className="block text-sm font-medium text-slate-700">
                    Comparisons per Student
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={comparisonsPerStudent}
                    onChange={(e) => {
                      setComparisonsPerStudent(Number(e.target.value));
                      setGenStatus("idle");
                      setGenResult(null);
                    }}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Recommended: 5–8 for reliable Elo rankings.
                  </p>
                </div>

                {/* Live preview of expected workload */}
                {studentCount !== null && videos.length >= 2 && (
                  <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                    <Info className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      With <strong>{studentCount}</strong> student
                      {studentCount !== 1 ? "s" : ""},{" "}
                      <strong>{videos.length}</strong> video
                      {videos.length !== 1 ? "s" : ""}, and{" "}
                      <strong>{comparisonsPerStudent}</strong> comparisons each, this will
                      create{" "}
                      <strong>
                        {Math.min(comparisonsPerStudent, (videos.length * (videos.length - 1)) / 2) *
                          studentCount}
                      </strong>{" "}
                      total assignments.
                    </span>
                  </div>
                )}
              </div>

              {/* Pre-flight checks */}
              <div className="flex flex-col gap-2">
                {[
                  {
                    ok: (studentCount ?? 0) > 0,
                    pass: `${studentCount} student${studentCount !== 1 ? "s" : ""} loaded`,
                    fail: "No students — upload a roster on the Upload Roster tab first",
                  },
                  {
                    ok: videos.length >= 2,
                    pass: `${videos.length} video${videos.length !== 1 ? "s" : ""} loaded`,
                    fail: "Need at least 2 videos — add them on the Videos tab first",
                  },
                ].map(({ ok, pass, fail }) => (
                  <div
                    key={pass}
                    className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm ${
                      ok
                        ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border border-amber-200 bg-amber-50 text-amber-700"
                    }`}
                  >
                    {ok ? (
                      <CheckCircle className="h-4 w-4 shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 shrink-0" />
                    )}
                    {ok ? pass : fail}
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-3">
                {/* Generate Assignments */}
                <button
                  onClick={handleGenerateAssignments}
                  disabled={
                    genStatus === "loading" ||
                    emailStatus === "loading" ||
                    (studentCount ?? 0) === 0 ||
                    videos.length < 2
                  }
                  className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {genStatus === "loading" ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
                  ) : (
                    <><Shuffle className="h-4 w-4" /> Generate Assignments</>
                  )}
                </button>

                {/* Send Assignment Emails */}
                <button
                  onClick={handleSendEmails}
                  disabled={
                    emailStatus === "loading" ||
                    genStatus === "loading" ||
                    (studentCount ?? 0) === 0
                  }
                  className="flex items-center gap-2 rounded-xl border border-indigo-300 bg-white px-6 py-3 text-sm font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {emailStatus === "loading" ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</>
                  ) : (
                    <><Mail className="h-4 w-4" /> Send Assignment Emails</>
                  )}
                </button>
              </div>

              {/* Generation result banners */}
              {genStatus === "success" && genResult && (
                <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-800">
                  <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  <div>
                    <p className="font-semibold">Assignments generated!</p>
                    <p className="text-sm">
                      Successfully created{" "}
                      <strong>{genResult.assignments} assignments</strong> across{" "}
                      <strong>{genResult.students} student{genResult.students !== 1 ? "s" : ""}</strong>.
                      {genResult.clampedTo !== undefined && (
                        <span className="ml-1 text-emerald-700">
                          (Comparisons capped at {genResult.clampedTo} — not enough unique pairs for
                          the requested number.)
                        </span>
                      )}
                    </p>
                    <p className="mt-1 text-xs text-emerald-700">
                      Click <strong>Send Assignment Emails</strong> to notify students.
                    </p>
                  </div>
                </div>
              )}
              {genStatus === "error" && genError && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-semibold">Generation failed</p>
                    <p>{genError}</p>
                  </div>
                </div>
              )}

              {/* Email result banners */}
              {emailStatus === "success" && emailSent !== null && (
                <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-800">
                  <Mail className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  <div>
                    <p className="font-semibold">Emails sent!</p>
                    <p className="text-sm">
                      Magic links delivered to <strong>{emailSent} student{emailSent !== 1 ? "s" : ""}</strong> with pending assignments.
                    </p>
                  </div>
                </div>
              )}
              {emailStatus === "error" && emailError && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-semibold">Email sending failed</p>
                    <p>{emailError}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Progress ──────────────────────────────────────────────────────── */}
          {activeTab === "progress" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-900">Student Progress</h2>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                  Live data coming in Phase 4
                </span>
              </div>

              <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-16 text-slate-400">
                <div className="text-center">
                  <BarChart2 className="mx-auto h-10 w-10 opacity-40" />
                  <p className="mt-2 text-sm font-medium">
                    Per-student progress will appear here once voting is live.
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── Semester Maintenance ─────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">Semester Maintenance</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Export data for your records or reset the system for a new semester.
          </p>
        </div>

        <div className="flex flex-col gap-6 p-6">
          {/* Export row */}
          <div>
            <p className="mb-3 text-sm font-medium text-slate-700">Export Data</p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleExportLeaderboard}
                disabled={exportingLeaderboard}
                className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50"
              >
                {exportingLeaderboard
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Download className="h-4 w-4" />}
                Export Leaderboard (CSV)
              </button>

              <button
                onClick={handleExportVotes}
                disabled={exportingVotes}
                className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50"
              >
                {exportingVotes
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Download className="h-4 w-4" />}
                Export Raw Votes (CSV)
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-100" />

          {/* Reset row */}
          <div>
            <p className="mb-1 text-sm font-medium text-slate-700">Danger Zone</p>
            <p className="mb-3 text-xs text-slate-500">
              Permanently deletes all students, pitches, votes, and assignments. This cannot be undone.
            </p>

            {!showResetConfirm ? (
              <button
                onClick={() => { setShowResetConfirm(true); setResetStatus("idle"); setResetError(null); }}
                className="flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:border-red-400 hover:bg-red-50"
              >
                <RotateCcw className="h-4 w-4" /> Reset System
              </button>
            ) : (
              <div className="flex flex-col gap-4 rounded-xl border border-red-200 bg-red-50 p-5">
                <div className="flex items-start gap-3">
                  <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                  <div>
                    <p className="font-semibold text-red-800">Are you sure?</p>
                    <p className="text-sm text-red-700">
                      This will permanently delete <strong>all students, pitches, votes, and assignments</strong>.
                      Export your data first if you need it.
                    </p>
                  </div>
                </div>

                {resetError && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-300 bg-white px-3 py-2 text-sm text-red-700">
                    <AlertCircle className="h-4 w-4 shrink-0" /> {resetError}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleReset}
                    disabled={resetStatus === "loading"}
                    className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                  >
                    {resetStatus === "loading"
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Resetting…</>
                      : <><RotateCcw className="h-4 w-4" /> Yes, delete everything</>}
                  </button>
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    disabled={resetStatus === "loading"}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {resetStatus === "success" && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                <CheckCircle className="h-4 w-4 shrink-0" />
                System reset — all data has been deleted. Ready for a new semester.
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
