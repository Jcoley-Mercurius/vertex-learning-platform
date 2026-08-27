import Link from "next/link";

import { Card, Icon } from "@/components/ui";
import { formatDuration } from "@/lib/format";

export type BookmarkedCourse = {
  courseId: string;
  title: string;
  href: string | null;
};

export type BookmarkedLesson = {
  lessonId: string;
  title: string;
  href: string | null;
  courseTitle: string | null;
  durationSeconds: number;
  completed: boolean;
  hasNote: boolean;
};

/**
 * The lessons a learner saved for later.
 *
 * Server-rendered from the progress the page has already read, so it costs no
 * extra round trip and no client state — the bookmarks themselves are toggled
 * on the course and lesson pages, this is only where the queue is read back.
 *
 * Courses come first and lessons after: a saved course is the coarser intent,
 * and the two are separate stores rather than one flag (see `lib/progress.ts`).
 */
export function BookmarkedLessons({
  courses,
  lessons,
}: {
  courses: BookmarkedCourse[];
  lessons: BookmarkedLesson[];
}) {
  return (
    <section className="mt-12">
      <h2 className="font-display text-heading-1 font-medium text-neutral-900">Bookmarked</h2>
      <p className="mt-2 text-body text-neutral-500">
        Courses and lessons you saved to come back to.
      </p>

      <ul className="mt-5 grid gap-4">
        {courses.map((course) => (
          <li key={course.courseId}>
            <Card as="article" className="flex flex-wrap items-center gap-x-5 gap-y-3 p-5">
              <Icon
                name="bookmark"
                variant="filled"
                size={20}
                className="shrink-0 text-primary-500"
              />

              <div className="min-w-0 flex-1">
                <h3 className="text-body-lg font-medium text-neutral-900">
                  {course.href ? (
                    <Link
                      href={course.href}
                      className="transition-colors hover:text-primary-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400"
                    >
                      {course.title}
                    </Link>
                  ) : (
                    course.title
                  )}
                </h3>
                <p className="mt-1 text-body text-neutral-500">Course</p>
              </div>
            </Card>
          </li>
        ))}

        {lessons.map((lesson) => (
          <li key={lesson.lessonId}>
            <Card as="article" className="flex flex-wrap items-center gap-x-5 gap-y-3 p-5">
              <Icon
                name="bookmark"
                variant="filled"
                size={20}
                className="shrink-0 text-primary-500"
              />

              <div className="min-w-0 flex-1">
                <h3 className="text-body-lg font-medium text-neutral-900">
                  {lesson.href ? (
                    <Link
                      href={lesson.href}
                      className="transition-colors hover:text-primary-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400"
                    >
                      {lesson.title}
                    </Link>
                  ) : (
                    lesson.title
                  )}
                </h3>
                {lesson.courseTitle ? (
                  <p className="mt-1 text-body text-neutral-500">{lesson.courseTitle}</p>
                ) : null}
              </div>

              <ul className="flex shrink-0 items-center gap-x-5 gap-y-2 text-body text-neutral-500">
                <li className="inline-flex items-center gap-2">
                  <Icon name="clock" size={18} className="text-primary-500" />
                  {formatDuration(lesson.durationSeconds)}
                </li>
                {lesson.hasNote ? (
                  <li className="inline-flex items-center gap-2">
                    <Icon name="file-text" size={18} className="text-primary-500" />
                    Noted
                  </li>
                ) : null}
                {lesson.completed ? (
                  <li className="inline-flex items-center gap-2">
                    <Icon name="check-circle" size={18} className="text-primary-500" />
                    Complete
                  </li>
                ) : null}
              </ul>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
