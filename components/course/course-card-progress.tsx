"use client";

import { useProgress } from "@/components/progress";
import { ProgressBar } from "@/components/ui";
import { courseProgress } from "@/lib/progress";

/**
 * The progress bar under a catalog card. It renders nothing at all unless the
 * signed-in learner has actually started the course, so a catalog full of
 * untouched courses looks exactly as it does today (AGENTS.md section 7).
 */
export function CourseCardProgress({
  lessonIds,
}: {
  /** The course's lesson ids in curriculum order; nulls are unresolved references. */
  lessonIds: (string | null)[];
}) {
  const { completed, byLesson, loaded } = useProgress();

  if (!loaded) return null;

  const ids = lessonIds.filter((id): id is string => Boolean(id));
  const summary = courseProgress(ids, completed, new Set(byLesson.keys()));

  if (!summary.started) return null;

  return (
    <div className="mt-4 border-t border-neutral-200 pt-4">
      <p className="text-body text-neutral-500">
        <span className="font-semibold text-neutral-900">{summary.percent}%</span> complete
      </p>
      <ProgressBar value={summary.percent} showLabel={false} className="mt-2" />
    </div>
  );
}
