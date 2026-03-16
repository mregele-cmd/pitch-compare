import Link from "next/link";
import { Users, Video, ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-10 py-12">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Pairwise Pitch Comparison
        </h1>
        <p className="mt-4 max-w-xl text-lg text-slate-600">
          A comparative grading tool for entrepreneurship courses. Students
          evaluate video pitches head-to-head; Elo ratings do the scoring.
        </p>
      </div>

      <div className="grid w-full max-w-2xl gap-5 sm:grid-cols-2">
        {/* Professor */}
        <Link
          href="/rooms"
          className="group flex flex-col gap-5 rounded-2xl border-2 border-slate-200 bg-white p-8 shadow-sm transition-all hover:border-indigo-400 hover:shadow-md"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-600">
            <Users className="h-7 w-7 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-slate-900">I&apos;m a Professor</h2>
            <p className="mt-1 text-sm text-slate-600">
              Create and manage class rooms, upload rosters, configure
              assignments, and view Elo rankings.
            </p>
          </div>
          <div className="flex items-center gap-1 text-sm font-medium text-indigo-600 transition-all group-hover:gap-2">
            Manage Rooms <ArrowRight className="h-4 w-4" />
          </div>
        </Link>

        {/* Student */}
        <Link
          href="/join"
          className="group flex flex-col gap-5 rounded-2xl border-2 border-slate-200 bg-white p-8 shadow-sm transition-all hover:border-emerald-400 hover:shadow-md"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-600">
            <Video className="h-7 w-7 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-slate-900">I&apos;m a Student</h2>
            <p className="mt-1 text-sm text-slate-600">
              Enter your room code to load your assigned pitch comparisons and
              start voting.
            </p>
          </div>
          <div className="flex items-center gap-1 text-sm font-medium text-emerald-600 transition-all group-hover:gap-2">
            Join a Room <ArrowRight className="h-4 w-4" />
          </div>
        </Link>
      </div>
    </div>
  );
}
