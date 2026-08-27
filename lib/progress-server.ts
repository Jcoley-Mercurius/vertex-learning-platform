import "server-only";

import { EMPTY_PROGRESS, isClerkUserId, type ProgressState } from "@/lib/progress";
import { PROGRESS_BY_USER_QUERY } from "@/sanity/lib/queries";
import { client } from "@/sanity/lib/client";

/**
 * Reading a learner's own progress, server side.
 *
 * Shared by `GET /api/progress` — which is what the prerendered pages call — and
 * by the My Learning page, which is dynamic and reads it directly rather than
 * making the browser fetch what the server already has.
 *
 * A read needs read permission and nothing more, so this uses the ordinary read
 * client — the write token belongs to `POST /api/progress` alone. `useCdn: false`
 * is the one override: a learner who has just finished a lesson must not be
 * handed the CDN's copy from before that write.
 */

export async function readProgress(userId: string): Promise<ProgressState> {
  if (!isClerkUserId(userId)) return EMPTY_PROGRESS;

  const data = await client
    .withConfig({ useCdn: false })
    .fetch(PROGRESS_BY_USER_QUERY, { userId });

  if (!data) return EMPTY_PROGRESS;

  return {
    /* The query already drops entries whose lesson reference no longer
       resolves, but the projection is still typed as nullable — a lesson
       deleted between the two is the case this filter exists for. */
    lessons: (data.lessons ?? []).flatMap((lesson) =>
      lesson.lessonId
        ? [
            {
              lessonId: lesson.lessonId,
              lessonSlug: lesson.lessonSlug ?? null,
              lessonTitle: lesson.lessonTitle ?? null,
              lessonDurationSeconds: lesson.lessonDurationSeconds ?? 0,
              completed: lesson.completed ?? false,
              positionSeconds: lesson.positionSeconds ?? 0,
              bookmarked: lesson.bookmarked ?? false,
              bookmarkedAt: lesson.bookmarkedAt ?? null,
              note: lesson.note ?? null,
              noteUpdatedAt: lesson.noteUpdatedAt ?? null,
              completedAt: lesson.completedAt ?? null,
              updatedAt: lesson.updatedAt ?? null,
            },
          ]
        : [],
    ),
    /* Same shape as the lessons above: the query drops entries whose reference
       no longer resolves, and this filter is for a course deleted between the
       two. */
    bookmarkedCourses: (data.bookmarkedCourses ?? []).flatMap((course) =>
      course.courseId
        ? [
            {
              courseId: course.courseId,
              courseTitle: course.courseTitle ?? null,
              courseSlug: course.courseSlug ?? null,
              bookmarkedAt: course.bookmarkedAt ?? null,
            },
          ]
        : [],
    ),
    lastLessonSlug: data.lastLessonSlug ?? null,
    lastActiveAt: data.lastActiveAt ?? null,
    notificationsReadAt: data.notificationsReadAt ?? null,
  };
}
