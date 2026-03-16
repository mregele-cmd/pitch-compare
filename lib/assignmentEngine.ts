// ── Types ──────────────────────────────────────────────────────────────────────

export interface VideoRecord {
  id: string;
  /** Comma-separated lowercase author emails, e.g. "alice@uni.edu, bob@uni.edu" */
  author_emails?: string | null;
}

export interface StudentRecord {
  id: string;
  /** Student email — used to exclude their own pitches from assignments */
  email?: string | null;
}

export interface AssignmentInsert {
  student_id: string;
  video_1_id: string;
  video_2_id: string;
  status: "pending";
}

export interface EngineResult {
  assignments: AssignmentInsert[];
  /** Set when the algorithm clamped comparisonsPerStudent due to too few videos */
  clampedTo?: number;
  error?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Core algorithm ────────────────────────────────────────────────────────────
//
// Goal: assign `comparisonsPerStudent` unique video pairs to every student so
// that every video receives roughly the same total number of comparisons.
//
// Team exclusion: if a student is listed in a video's author_emails they are
// never assigned a pair that contains that video.
//
// Strategy:
//   1. Build the full set of unique ordered pairs (v_i, v_j) where i < j.
//   2. Pre-compute a map of email → Set<videoId> for O(1) exclusion lookup.
//   3. Maintain a global usage counter for every pair.
//   4. For each student (in randomised order):
//        a. Determine their eligible pairs (excluding authored videos).
//        b. Shuffle for intra-tier randomness, stable-sort by ascending usage.
//        c. Pick the first `count` pairs, increment their usage counters.

export function buildAssignments(
  students: StudentRecord[],
  videos: VideoRecord[],
  comparisonsPerStudent: number
): EngineResult {
  if (videos.length < 2) {
    return { assignments: [], error: "At least 2 videos are required to generate assignments." };
  }
  if (students.length === 0) {
    return { assignments: [], error: "No students found. Upload a roster first." };
  }

  // Build all unique pairs
  const allPairs: [string, string][] = [];
  for (let i = 0; i < videos.length; i++) {
    for (let j = i + 1; j < videos.length; j++) {
      allPairs.push([videos[i].id, videos[j].id]);
    }
  }

  const maxPossible  = allPairs.length;
  const clampedCount = Math.min(comparisonsPerStudent, maxPossible);
  const clamped      = clampedCount < comparisonsPerStudent ? clampedCount : undefined;

  // Pre-compute author email → Set<videoId> for fast exclusion lookup
  const authorVideoIds = new Map<string, Set<string>>();
  for (const v of videos) {
    if (!v.author_emails) continue;
    for (const raw of v.author_emails.split(",")) {
      const email = raw.trim().toLowerCase();
      if (!email) continue;
      if (!authorVideoIds.has(email)) authorVideoIds.set(email, new Set());
      authorVideoIds.get(email)!.add(v.id);
    }
  }

  // Global usage counter: key = "id1:id2"
  const pairCount = new Map<string, number>(
    allPairs.map(([a, b]) => [`${a}:${b}`, 0])
  );

  const assignments: AssignmentInsert[] = [];

  for (const student of shuffle(students)) {
    const emailLower  = student.email?.toLowerCase() ?? "";
    const ownVideoIds = authorVideoIds.get(emailLower) ?? new Set<string>();

    // Filter out pairs that contain a video this student authored
    const eligiblePairs =
      ownVideoIds.size > 0
        ? allPairs.filter(([v1, v2]) => !ownVideoIds.has(v1) && !ownVideoIds.has(v2))
        : allPairs;

    const countForStudent = Math.min(clampedCount, eligiblePairs.length);

    const candidates = shuffle(eligiblePairs).sort(
      (a, b) =>
        (pairCount.get(`${a[0]}:${a[1]}`) ?? 0) -
        (pairCount.get(`${b[0]}:${b[1]}`) ?? 0)
    );

    for (const [v1, v2] of candidates.slice(0, countForStudent)) {
      assignments.push({ student_id: student.id, video_1_id: v1, video_2_id: v2, status: "pending" });
      const key = `${v1}:${v2}`;
      pairCount.set(key, (pairCount.get(key) ?? 0) + 1);
    }
  }

  return { assignments, clampedTo: clamped };
}
