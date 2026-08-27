/**
 * Learner progress, derived (AGENTS.md sections 7 and 8).
 *
 * Nothing in here is stored. Sanity holds one flat list of lessons a learner
 * has touched; every percentage, every "which lesson do I resume", and every
 * completion mark is computed from that list against a course's curriculum
 * order — the same way module and lesson numbers are positional rather than
 * authored.
 *
 * Shared by the server (the progress route, the My Learning page) and the
 * browser (the progress provider), so it stays free of both `server-only` and
 * React.
 */

/** One lesson's state, as the progress route hands it out. */
export type LessonProgress = {
  lessonId: string;
  lessonSlug: string | null;
  completed: boolean;
  positionSeconds: number;
  updatedAt: string | null;
};

/** Everything the browser and the pages know about a learner's progress. */
export type ProgressState = {
  lessons: LessonProgress[];
  lastLessonSlug: string | null;
  lastActiveAt: string | null;
};

/** What a signed-out visitor gets: a valid, empty state rather than an error. */
export const EMPTY_PROGRESS: ProgressState = {
  lessons: [],
  lastLessonSlug: null,
  lastActiveAt: null,
};

/**
 * The document id for a learner. The one derived id in the schema, and it is
 * derived on the server from the session — never from anything a request body
 * carries (see `app/api/progress/route.ts`).
 */
export function progressDocId(userId: string) {
  return `progress.${userId}`;
}

/** Clerk ids look like `user_2ab…`. Anything else is not a session we wrote. */
export function isClerkUserId(value: string): boolean {
  return /^user_[a-zA-Z0-9]+$/.test(value);
}

/** The lesson ids a learner has finished, as a set for O(1) marks. */
export function completedLessonIds(progress: ProgressState): Set<string> {
  return new Set(
    progress.lessons.filter((lesson) => lesson.completed).map((lesson) => lesson.lessonId),
  );
}

/** A lesson id to its state, for the resume position and the "in progress" mark. */
export function lessonProgressById(progress: ProgressState): Map<string, LessonProgress> {
  return new Map(progress.lessons.map((lesson) => [lesson.lessonId, lesson]));
}

export type CourseProgressSummary = {
  completed: number;
  total: number;
  /** Whole percent, 0–100. 0 when the course has no lessons. */
  percent: number;
  started: boolean;
  finished: boolean;
};

/**
 * A course's progress, from its curriculum order and the learner's completions.
 *
 * `started` is deliberately wider than `completed > 0`: a learner who is
 * half-way through the first lesson has started the course, and My Learning has
 * to show them under Continue Learning rather than Not started.
 */
export function courseProgress(
  lessonIds: string[],
  completed: Set<string>,
  touched: Set<string> = completed,
): CourseProgressSummary {
  const total = lessonIds.length;
  const done = lessonIds.filter((id) => completed.has(id)).length;

  return {
    completed: done,
    total,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
    started: lessonIds.some((id) => touched.has(id)),
    finished: total > 0 && done === total,
  };
}

/**
 * Where "Continue Learning" points: the first lesson in curriculum order the
 * learner has not finished, falling back to the first lesson of the course. A
 * finished course resumes at its first lesson, as a re-watch.
 */
export function resumeLessonIndex(lessonIds: string[], completed: Set<string>): number {
  const next = lessonIds.findIndex((id) => !completed.has(id));
  return next === -1 ? 0 : next;
}

/** Seconds of lesson runtime a learner has finished, for the My Learning summary. */
export function watchedSeconds(
  lessons: { _id: string; durationSeconds: number }[],
  completed: Set<string>,
) {
  return lessons.reduce(
    (total, lesson) => (completed.has(lesson._id) ? total + lesson.durationSeconds : total),
    0,
  );
}
