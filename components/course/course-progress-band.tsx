"use client";

import { useProgress } from "@/components/progress";
import { courseProgress, resumeLessonIndex } from "@/lib/progress";

import { CourseProgress } from "./course-progress";

/**
 * The course page's progress band, wired to the learner.
 *
 * The page itself is statically prerendered and never reads the session, so this
 * is the seam where the zero state becomes real: `useProgress()` supplies the
 * completions, and the percentage and the resume target are derived from the
 * curriculum order here (AGENTS.md section 7 — nothing about progress is stored
 * on a course).
 */
export function CourseProgressBand({
  lessons,
}: {
  /** The course's lessons in curriculum order. `href` is null for an unslugged lesson. */
  lessons: { _id: string; href: string | null }[];
}) {
  const { completed, byLesson, loaded } = useProgress();

  const ids = lessons.map((lesson) => lesson._id);
  const touched = new Set(byLesson.keys());
  const summary = courseProgress(ids, completed, touched);

  /* Resume at the first unfinished lesson; a course with nothing recorded starts
     at the beginning, which is the same place. */
  const target = lessons[resumeLessonIndex(ids, completed)];
  const first = lessons.find((lesson) => lesson.href);
  const href = target?.href ?? first?.href ?? undefined;

  const started = loaded && summary.started;

  return (
    <CourseProgress
      progress={loaded ? summary.percent : null}
      href={href}
      label={summary.finished ? "Review Course" : started ? "Continue Learning" : "Start Learning"}
    />
  );
}
