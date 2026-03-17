import Link from "next/link";
import { Video } from "lucide-react";

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 sm:flex-row sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-600">
            <Video className="h-3.5 w-3.5 text-white" />
          </div>
          <span>
            Pitch<span className="font-semibold text-indigo-600">Compare</span>
          </span>
          <span className="text-slate-300">·</span>
          <span>Pairwise Elo evaluation for student pitches</span>
        </div>

        {/* Links */}
        <div className="flex items-center gap-5 text-sm">
          <Link href="/about" className="text-slate-500 hover:text-indigo-600 transition-colors">
            Help &amp; About
          </Link>
          <Link href="/admin/login" className="text-slate-500 hover:text-indigo-600 transition-colors">
            Professor Portal
          </Link>
        </div>
      </div>
    </footer>
  );
}
