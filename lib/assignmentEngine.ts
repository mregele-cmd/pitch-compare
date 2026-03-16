// ── Types ──────────────────────────────────────────────────────────────────────

export interface VideoRecord {
  id: string;
}

export interface StudentRecord {
  id: string;
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
// Strategy:
//   1. Build the full set of unique ordered pairs (v_i, v_j) where i < j.
//   2. Maintain a usage counter for every pair.
//   3. For each student (in randomised order):
//        a. Shuffle all pairs for randomness within the same frequency tier.
//        b. Stable-sort by ascending usage count so the least-seen pairs
//           rise to the top.
//        c. Pick the first `count` pairs, increment their usage counters.
//   This guarantees no student sees the same pair twice and the distribution
//   across pairs (and therefore individual videos) is kept as equal as possible.

export function buildAssignments(
  students: StudentRecord[],
  videos: VideoRecord[],
  comparisonsPerStudent: number
): EngineResult {
  if (videos.length < 2) {
    return {
      assignments: [],
      error: "At least 2 videos are required to generate assignments.",
    };
  }
  if (students.length === 0) {
    return {
      assignments: [],
      error: "No students found. Upload a roster first.",
    };
  }

  // Build all unique pairs
  const allPairs: [string, string][] = [];
  for (let i = 0; i < videos.length; i++) {
    for (let j = i + 1; j < videos.length; j++) {
      allPairs.push([videos[i].id, videos[j].id]);
    }
  }

  const maxPossible = allPairs.length;
  const clampedCount = Math.min(comparisonsPerStudent, maxPossible);
  const clamped = clampedCount < comparisonsPerStudent ? clampedCount : undefined;

  // Usage counter: key = "id1:id2"
  const pairCount = new Map<string, number>(
    allPairs.map(([a, b]) => [`${a}:${b}`, 0])
  );

  const assignments: AssignmentInsert[] = [];

  // Randomise student order so no one consistently gets the most-common pairs
  for (const student of shuffle(students)) {
    // Shuffle for intra-tier randomness, then stable-sort by ascending count
    const candidates = shuffle(allPairs).sort(
      (a, b) =>
        (pairCount.get(`${a[0]}:${a[1]}`) ?? 0) -
        (pairCount.get(`${b[0]}:${b[1]}`) ?? 0)
    );

    for (const [v1, v2] of candidates.slice(0, clampedCount)) {
      assignments.push({
        student_id: student.id,
        video_1_id: v1,
        video_2_id: v2,
        status: "pending",
      });
      const key = `${v1}:${v2}`;
      pairCount.set(key, (pairCount.get(key) ?? 0) + 1);
    }
  }

  return { assignments, clampedTo: clamped };
}
