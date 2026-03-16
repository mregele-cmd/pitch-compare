import Link from "next/link";
import { BarChart2, LayoutDashboard, Video, ArrowRight } from "lucide-react";

const cards = [
  {
    href: "/dashboard",
    icon: LayoutDashboard,
    color: "bg-indigo-600",
    title: "Professor Dashboard",
    description:
      "Upload student rosters, configure comparison assignments, and monitor grading progress.",
    cta: "Go to Dashboard",
  },
  {
    href: "/vote",
    icon: Video,
    color: "bg-emerald-600",
    title: "Student Voting",
    description:
      "Watch two pitches side-by-side and click the one you believe is stronger. Complete your assigned comparisons here.",
    cta: "Start Voting",
  },
  {
    href: "/leaderboard",
    icon: BarChart2,
    color: "bg-violet-600",
    title: "Leaderboard",
    description:
      "See how pitches are ranked in real time based on Elo ratings calculated from every vote.",
    cta: "View Rankings",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col items-center gap-12 py-12">
      {/* Hero */}
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Pairwise Pitch Comparison
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-600">
          A comparative grading tool for Social Entrepreneurship and New Venture
          Strategy courses. Students evaluate video pitches head-to-head; Elo
          ratings do the rest.
        </p>
      </div>

      {/* Feature cards */}
      <div className="grid w-full max-w-5xl gap-6 sm:grid-cols-3">
        {cards.map(({ href, icon: Icon, color, title, description, cta }) => (
          <Link
            key={href}
            href={href}
            className="group flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-xl ${color}`}
            >
              <Icon className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
              <p className="mt-1 text-sm text-slate-600">{description}</p>
            </div>
            <div className="flex items-center gap-1 text-sm font-medium text-indigo-600 group-hover:gap-2 transition-all">
              {cta} <ArrowRight className="h-4 w-4" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
