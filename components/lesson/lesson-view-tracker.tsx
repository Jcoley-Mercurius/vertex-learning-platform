"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

/**
 * `lesson_viewed`, captured once per lesson (AGENTS.md section 7). Nothing is
 * rendered: the event carries only the lesson's identity and position.
 */
export function LessonViewTracker({
  lessonId,
  lessonTitle,
  lessonLabel,
  courseTitle,
  freePreview,
  durationSeconds,
}: {
  lessonId: string;
  lessonTitle: string;
  lessonLabel: string;
  courseTitle: string;
  freePreview: boolean;
  durationSeconds: number;
}) {
  useEffect(() => {
    posthog.capture("lesson_viewed", {
      lesson_id: lessonId,
      lesson_title: lessonTitle,
      lesson_label: lessonLabel,
      course_title: courseTitle,
      free_preview: freePreview,
      duration_seconds: durationSeconds,
    });
  }, [courseTitle, durationSeconds, freePreview, lessonId, lessonLabel, lessonTitle]);

  return null;
}
