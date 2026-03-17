import type { Metadata } from "next";
import katex from "katex";
import "katex/dist/katex.min.css";
import Link from "next/link";
import {
  Users, Brain, BarChart2, GraduationCap, BookOpen,
  Hash, Video, CheckCircle2, Upload, Shuffle, ArrowRight,
  FileText, AlertTriangle, MonitorPlay,
} from "lucide-react";
import VoteDemo from "@/components/VoteDemo";

export const metadata: Metadata = {
  title: "About & Help · PitchCompare",
  description: "How PitchCompare works: the pedagogy, the Elo math, and guides for students and professors.",
};

function renderLatex(src: string, display = false) {
  return katex.renderToString(src, { throwOnError: false, displayMode: display });
}

// ── Reusable section wrapper ──────────────────────────────────────────────────
function Section({
  id,
  children,
  className = "",
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`scroll-mt-24 ${className}`}>
      {children}
    </section>
  );
}

// ── Step card ─────────────────────────────────────────────────────────────────
function Step({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
        {number}
      </div>
      <div className="pt-1">
        <h4 className="font-semibold text-slate-900">{title}</h4>
        <p className="mt-1 text-slate-600">{children}</p>
      </div>
    </div>
  );
}

// ── CSV column spec ───────────────────────────────────────────────────────────
function ColSpec({ cols }: { cols: { name: string; required: boolean; desc: string }[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left">
            <th className="px-4 py-3 font-semibold text-slate-700">Column</th>
            <th className="px-4 py-3 font-semibold text-slate-700">Required</th>
            <th className="px-4 py-3 font-semibold text-slate-700">Description</th>
          </tr>
        </thead>
        <tbody>
          {cols.map((c) => (
            <tr key={c.name} className="border-b border-slate-100 last:border-0">
              <td className="px-4 py-3 font-mono text-indigo-700">{c.name}</td>
              <td className="px-4 py-3">
                {c.required ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                    Required
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                    Optional
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-slate-600">{c.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function AboutPage() {
  // Pre-render LaTeX formulas server-side
  const eloFormula = renderLatex(
    "E_A = \\dfrac{1}{1 + 10^{(R_B - R_A)/400}}",
    true
  );
  const eloUpdate = renderLatex(
    "R_A' = R_A + K \\cdot (S_A - E_A)",
    true
  );

  return (
    <div className="mx-auto max-w-4xl space-y-20 py-4">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="rounded-3xl bg-gradient-to-br from-indigo-600 to-indigo-800 px-8 py-14 text-center text-white shadow-xl sm:px-16">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/30">
          <BookOpen className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          About PitchCompare
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-indigo-100">
          A tool for evaluating student pitches through pairwise comparison —
          more reliable, less subjective, and grounded in the same mathematics
          used by chess grandmasters.
        </p>

        {/* On-page nav */}
        <div className="mt-8 flex flex-wrap justify-center gap-2 text-sm">
          {[
            ["#the-problem",  "The Problem"],
            ["#the-science",  "The Science"],
            ["#the-math",     "The Math"],
            ["#student-guide","Student Guide"],
            ["#prof-guide",   "Professor Guide"],
            ["#live-demo",    "Live Demo"],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="rounded-full bg-white/15 px-4 py-1.5 font-medium text-white ring-1 ring-white/25 hover:bg-white/25 transition-colors"
            >
              {label}
            </a>
          ))}
        </div>
      </div>

      {/* ── The Subjectivity Trap ─────────────────────────────────────────── */}
      <Section id="the-problem">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">The Subjectivity Trap</h2>
        </div>

        <div className="space-y-4 text-slate-600 leading-relaxed">
          <p>
            Traditional rubrics ask evaluators to rate a pitch on a fixed scale — say,
            <em> 1 to 5 for "clarity"</em>. This approach has a fundamental flaw known as
            <strong className="text-slate-800"> inter-rater unreliability</strong>: different people
            calibrate scales differently. One professor's 4 is another's 3. A student who
            evaluates early in the session rates differently from one who evaluates after
            fatigue sets in.
          </p>
          <p>
            When the stakes are grades, these inconsistencies matter. Rubric scores can
            reflect how strict the evaluator is just as much as how good the pitch actually was.
          </p>

          <div className="grid gap-4 sm:grid-cols-2 mt-6">
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
              <h3 className="flex items-center gap-2 font-semibold text-red-800 mb-2">
                <span className="text-lg">✗</span> Rubric Scoring
              </h3>
              <ul className="space-y-1 text-sm text-red-700">
                <li>Absolute scales are hard to calibrate</li>
                <li>Prone to halo effects and anchoring bias</li>
                <li>Rater fatigue distorts late evaluations</li>
                <li>Students must evaluate quality in the abstract</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <h3 className="flex items-center gap-2 font-semibold text-emerald-800 mb-2">
                <span className="text-lg">✓</span> Pairwise Comparison
              </h3>
              <ul className="space-y-1 text-sm text-emerald-700">
                <li>One simple question: <em>which is better?</em></li>
                <li>Easier and more reliable for the human brain</li>
                <li>Bias cancels out across many comparisons</li>
                <li>Produces consistent, stable rankings</li>
              </ul>
            </div>
          </div>
        </div>
      </Section>

      {/* ── Wisdom of the Crowd ───────────────────────────────────────────── */}
      <Section id="the-science">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
            <Brain className="h-5 w-5 text-indigo-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">The Wisdom of the Crowd</h2>
        </div>

        <div className="space-y-4 text-slate-600 leading-relaxed">
          <p>
            Psychologist L.L. Thurstone established in 1927 that humans are
            far more accurate at <em>relative</em> judgments ("A is better than B")
            than <em>absolute</em> ones ("A is a 3.8/5"). His <em>Law of Comparative Judgment</em>
            is the theoretical foundation for pairwise comparison.
          </p>
          <p>
            PitchCompare distributes comparisons across an entire class.
            Each student sees a small number of pairs, but the
            <strong className="text-slate-800"> collective signal </strong>
            from all comparisons produces a ranking far more reliable than any single
            evaluator. Individual quirks and biases average out; the signal from a
            genuinely excellent pitch rises to the top.
          </p>
          <p>
            This mirrors how platforms like
            <strong className="text-slate-800"> Google PageRank</strong>,
            <strong className="text-slate-800"> Reddit's ranking algorithm</strong>, and
            <strong className="text-slate-800"> peer-review in academia</strong> work —
            many independent judges, aggregated intelligently.
          </p>
        </div>
      </Section>

      {/* ── The Math ──────────────────────────────────────────────────────── */}
      <Section id="the-math">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
            <BarChart2 className="h-5 w-5 text-violet-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">The Elo Rating System</h2>
        </div>

        <div className="space-y-4 text-slate-600 leading-relaxed">
          <p>
            To turn pairwise wins and losses into a continuous ranking, PitchCompare uses
            the <strong className="text-slate-800">Elo rating system</strong> — invented by
            physicist Arpad Elo and adopted by FIDE (the World Chess Federation) in 1970.
            It is still used today to rank chess players, football teams, and video-game
            competitors worldwide.
          </p>

          <p>
            Every pitch starts with a rating of <strong>1 000</strong>.
            After each comparison, points are transferred from the loser to the winner.
            The amount transferred depends on the <em>expected outcome</em>:
            beating a highly-rated pitch earns more points than beating a low-rated one.
          </p>
        </div>

        {/* Formula block */}
        <div className="my-8 rounded-2xl border border-indigo-200 bg-indigo-50 p-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-indigo-500">
            Step 1 — Expected score
          </p>
          <div
            className="overflow-x-auto py-2"
            dangerouslySetInnerHTML={{ __html: eloFormula }}
          />
          <p className="mt-4 text-sm text-slate-600">
            Where <em>R<sub>A</sub></em> and <em>R<sub>B</sub></em> are the current ratings
            of pitch A and pitch B. <em>E<sub>A</sub></em> is the probability (0–1) that
            pitch A wins. A 400-point gap gives the stronger pitch a 10× odds advantage.
          </p>
        </div>

        <div className="my-8 rounded-2xl border border-violet-200 bg-violet-50 p-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-violet-500">
            Step 2 — Update rating
          </p>
          <div
            className="overflow-x-auto py-2"
            dangerouslySetInnerHTML={{ __html: eloUpdate }}
          />
          <p className="mt-4 text-sm text-slate-600">
            <em>S<sub>A</sub></em> is the actual result (1 for a win, 0 for a loss).
            <em> K = 32</em> is the sensitivity factor — the maximum points that can change
            hands in a single comparison. The rating converges quickly as more comparisons
            are recorded.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
          <strong className="text-slate-800">Why this works for pitches:</strong> the Elo
          system is designed to operate with <em>incomplete round-robins</em> — not every
          pitch needs to face every other pitch. A well-designed assignment schedule (which
          PitchCompare generates automatically) produces statistically reliable rankings
          with as few as 5–8 comparisons per student.
        </div>
      </Section>

      {/* ── Student Guide ─────────────────────────────────────────────────── */}
      <Section id="student-guide">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
            <GraduationCap className="h-5 w-5 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Student Guide</h2>
        </div>

        <p className="mb-8 text-slate-600">
          No account needed. You only need the Room Code your professor shared and your
          university email address.
        </p>

        <div className="space-y-8">
          <Step number={1} title="Join with your Room Code">
            On the homepage, type the Room Code your professor gave you (e.g.{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-sm text-indigo-700">
              MKTG42
            </code>
            ) and press <strong>Join Pitch Room</strong>. You will be taken directly to
            the voting screen.
          </Step>

          <Step number={2} title="Enter your email">
            Enter your university email address. This is used only to track your
            individual assignment queue — it is never shared publicly.
          </Step>

          <Step number={3} title="Evaluate pairs — A vs. B">
            You will be shown two pitches side by side. Watch both videos and click
            the one you think is the stronger pitch. There are no trick questions:
            go with your honest judgment.{" "}
            <strong>Your own pitch will never appear in your queue</strong> — the
            system detects your authorship and filters it out automatically, eliminating
            self-serving bias.
          </Step>
        </div>

        <div className="mt-8 rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />
            <div className="text-sm text-indigo-800">
              <strong>My Pitch card:</strong> if your team uploaded a pitch and listed your
              email as an author, you will see a <em>Your Pitch</em> card at the top of the
              screen. Use this to check how your pitch is being rendered before voting begins.
            </div>
          </div>
        </div>
      </Section>

      {/* ── Professor Guide ───────────────────────────────────────────────── */}
      <Section id="prof-guide">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
            <Users className="h-5 w-5 text-indigo-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Professor Guide</h2>
        </div>

        <p className="mb-8 text-slate-600">
          Sign in at the{" "}
          <Link href="/admin/login" className="text-indigo-600 hover:underline">
            Professor Portal
          </Link>{" "}
          to create and manage Pitch Rooms. Each room is independent — students, pitches,
          assignments, and votes are all scoped to a single room.
        </p>

        {/* Workflow */}
        <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Hash,    label: "1. Create Room",      desc: "A unique Room Code is generated automatically." },
            { icon: Upload,  label: "2. Upload Roster",    desc: "Import students via students.csv." },
            { icon: Video,   label: "3. Upload Pitches",   desc: "Import videos via pitches.csv." },
            { icon: Shuffle, label: "4. Generate Pairs",   desc: "The system builds balanced comparison assignments." },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <Icon className="mb-2 h-5 w-5 text-indigo-500" />
              <p className="text-sm font-semibold text-slate-800">{label}</p>
              <p className="mt-1 text-xs text-slate-500">{desc}</p>
            </div>
          ))}
        </div>

        {/* students.csv */}
        <div className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-slate-500" />
            <h3 className="text-lg font-semibold text-slate-900">
              <code className="font-mono text-indigo-700">students.csv</code>
            </h3>
          </div>
          <p className="mb-4 text-sm text-slate-600">
            Upload the class roster. The system uses email addresses to match students to
            their own pitches and to track their assignment progress.
          </p>
          <ColSpec
            cols={[
              { name: "Name",  required: true,  desc: "Student's full name (e.g. Jane Smith)" },
              { name: "Email", required: true,  desc: "University email address — must match the email the student uses to log in" },
            ]}
          />
          <div className="mt-3 rounded-lg bg-slate-50 px-4 py-3 font-mono text-xs text-slate-600">
            Name,Email<br />
            Jane Smith,jsmith@university.edu<br />
            John Doe,jdoe@university.edu
          </div>
        </div>

        {/* pitches.csv */}
        <div className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-slate-500" />
            <h3 className="text-lg font-semibold text-slate-900">
              <code className="font-mono text-indigo-700">pitches.csv</code>
            </h3>
          </div>
          <p className="mb-4 text-sm text-slate-600">
            Upload the pitch videos. YouTube links are automatically normalised — paste
            regular watch links, short links (<code className="font-mono text-xs">youtu.be/…</code>),
            or Shorts links interchangeably.
          </p>
          <ColSpec
            cols={[
              { name: "title",         required: true,  desc: 'Display name for the pitch (e.g. "Team Alpha – GreenBrew")' },
              { name: "url",           required: true,  desc: "Any YouTube URL format: watch?v=, youtu.be/, or /shorts/" },
              { name: "author_emails", required: false, desc: "Comma-separated emails of team members. Used to filter pitches from their authors' queues." },
            ]}
          />
          <div className="mt-3 rounded-lg bg-slate-50 px-4 py-3 font-mono text-xs text-slate-600">
            title,url,author_emails<br />
            "Team Alpha",https://www.youtube.com/watch?v=dQw4w9WgXcQ,"alice@uni.edu, bob@uni.edu"<br />
            "Team Beta",https://youtu.be/xxxxxxxxxxx,charlie@uni.edu
          </div>
        </div>

        {/* Tips */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          <strong className="block mb-1">Tips</strong>
          <ul className="list-disc list-inside space-y-1">
            <li>Download the CSV templates from the room Dashboard — they include the correct column headers.</li>
            <li>Set <strong>Comparisons per student</strong> to 5–8 for classes of 20–40 students.</li>
            <li>Re-generate assignments if you add pitches after the initial upload.</li>
            <li>Use <strong>Reset Room</strong> to clear all data and start fresh without deleting the room.</li>
          </ul>
        </div>
      </Section>

      {/* ── Live Demo ─────────────────────────────────────────────────────── */}
      <Section id="live-demo" className="pb-2">
        {/* Section header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600">
            <MonitorPlay className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">
            Experience the Student View
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-slate-500">
            This is the exact interface your students will see. Pick the stronger pitch
            and click Submit — no data is saved.
          </p>
        </div>

        {/* Demo container — same outer chrome the real voting page lives in */}
        <div className="rounded-3xl border border-indigo-200 bg-white p-6 shadow-md sm:p-8">
          <VoteDemo />
        </div>

        {/* CTA directly below the demo */}
        <div className="mt-8 text-center">
          <Link
            href="/admin/signup"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-3.5 text-sm font-semibold text-white shadow-md hover:bg-indigo-700"
          >
            Launch your first Pitch Room →
          </Link>
          <p className="mt-3 text-xs text-slate-400">
            Requires an invite code from your institution.
          </p>
        </div>
      </Section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <Section id="get-started" className="pb-8">
        <div className="rounded-3xl bg-slate-900 px-8 py-12 text-center text-white">
          <h2 className="text-2xl font-bold">Ready to get started?</h2>
          <p className="mt-2 text-slate-400">
            Students join with a Room Code. Professors sign in to the portal.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold hover:bg-indigo-700"
            >
              Join a Pitch Room <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/admin/login"
              className="flex items-center gap-2 rounded-xl border border-slate-600 px-6 py-3 text-sm font-semibold text-slate-200 hover:border-slate-400 hover:text-white"
            >
              Professor Portal
            </Link>
          </div>
        </div>
      </Section>

    </div>
  );
}
