import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";

import {
  BookmarkedLessons,
  LearningCourseCard,
  LearningSummary,
  type BookmarkedCourse,
  type BookmarkedLesson,
  type LearningCourse,
} from "@/components/my-learning";
import { SiteHeader, ViewTracker, type CourseGlyphName } from "@/components/site";
import { Icon, buttonClassName } from "@/components/ui";
import { formatDuration, pluralize } from "@/lib/format";
import {
  EMPTY_PROGRESS,
  bookmarkedCourses,
  bookmarkedLessons,
  completedLessonIds,
  courseProgress,
  lessonProgressById,
  noteCount,
  resumeLessonIndex,
  watchedSeconds,
} from "@/lib/progress";
import { readProgress } from "@/lib/progress-server";
import { MY_LEARNING_QUERY } from "@/sanity/lib/queries";
import { sanityFetch } from "@/sanity/lib/live";

/**
 * My Learning: where a learner picks up (AGENTS.md section 7).
 *
 * The one page in the app that is per-learner, so the one page that reads the
 * session on the server. Everything else stays statically prerendered and
 * overlays progress in the browser; here the whole page *is* the progress, so
 * fetching it server side is both simpler and faster than a client round trip.
 *
 * It is gated in `proxy.ts`, so a signed-out visitor never reaches this code.
 *
 * There is no reference image for this page. It is assembled from the shipped
 * design system — the catalog's column and type scale, the course page's card,
 * progress bar and button — rather than a new treatment (AGENTS.md section 3).
 */

export const metadata: Metadata = {
  title: "My Learning — Vertex",
  description: "Your courses, where you left off.",
};

const columnClassName = "mx-auto w-full max-w-[936px] px-6";

export default async function MyLearningPage() {
  const { userId } = await auth();

  /* The middleware has already redirected anyone without a session; this is the
     type-level tail of that, not a second gate. */
  const progress = userId ? await readProgress(userId) : EMPTY_PROGRESS;

  const { data } = await sanityFetch({
    query: MY_LEARNING_QUERY,
    perspective: "published",
    stega: false,
  });

  const completed = completedLessonIds(progress);
  /* Wider than `completed`: a lesson left half-watched still means the course is
     underway, and belongs under Continue Learning rather than Not started. */
  const touched = new Set(lessonProgressById(progress).keys());

  /* Each course scored against the learner's completions. Percentages, the
     resume target and the in-progress/finished split are all derived here —
     none of it is stored on a course. */
  const scored = (data ?? []).map((course) => {
    /* A module slot whose lesson reference no longer resolves comes back null. */
    const lessons = (course.lessons ?? [])
      .filter((lesson) => lesson !== null)
      .map((lesson) => ({
        _id: lesson._id,
        href: lesson.slug ? `/lessons/${lesson.slug}` : null,
        title: lesson.title ?? "Untitled lesson",
        durationSeconds: lesson.durationSeconds ?? 0,
      }));

    const ids = lessons.map((lesson) => lesson._id);
    const summary = courseProgress(ids, completed, touched);
    const resume = lessons[resumeLessonIndex(ids, completed)] ?? lessons.find((l) => l.href);

    const card: LearningCourse = {
      _id: course._id,
      title: course.title ?? "Untitled course",
      href: `/courses/${course.slug}`,
      summary: course.summary ?? "",
      glyph: (course.glyph as CourseGlyphName | null) ?? "nextjs",
      percent: summary.percent,
      completedLessons: summary.completed,
      totalLessons: summary.total,
      durationSeconds: course.durationSeconds,
      resumeHref: resume?.href ?? null,
      resumeLabel: summary.finished
        ? "Every lesson complete"
        : resume
          ? `Up next: ${resume.title}`
          : "No lessons published yet",
      action: summary.finished ? "Review course" : summary.started ? "Continue" : "Start course",
    };

    return { card, summary, lessons };
  });

  const inProgress = scored.filter((item) => item.summary.started && !item.summary.finished);
  const finished = scored.filter((item) => item.summary.finished);
  const notStarted = scored.filter((item) => !item.summary.started);

  /* Which course a bookmarked lesson belongs to. The progress record knows the
     lesson but not its course — a lesson does not store its parent (AGENTS.md
     section 8) — so it is read back out of the curriculum walk above. */
  const courseTitleByLesson = new Map<string, string>();

  for (const item of scored) {
    for (const lesson of item.lessons) {
      if (!courseTitleByLesson.has(lesson._id)) {
        courseTitleByLesson.set(lesson._id, item.card.title);
      }
    }
  }

  const bookmarks: BookmarkedLesson[] = bookmarkedLessons(progress).map((lesson) => ({
    lessonId: lesson.lessonId,
    title: lesson.lessonTitle ?? "Untitled lesson",
    href: lesson.lessonSlug ? `/lessons/${lesson.lessonSlug}` : null,
    courseTitle: courseTitleByLesson.get(lesson.lessonId) ?? null,
    durationSeconds: lesson.lessonDurationSeconds,
    completed: lesson.completed,
    hasNote: (lesson.note ?? "").trim().length > 0,
  }));

  const courseBookmarks: BookmarkedCourse[] = bookmarkedCourses(progress).map((course) => ({
    courseId: course.courseId,
    title: course.courseTitle ?? "Untitled course",
    href: course.courseSlug ? `/courses/${course.courseSlug}` : null,
  }));

  const notesWritten = noteCount(progress);

  const lessonsCompleted = completed.size;
  const byLesson = lessonProgressById(progress);
  const secondsWatched = watchedSeconds(
    scored.flatMap((item) => item.lessons),
    completed,
    byLesson,
  );

  const hasProgress = inProgress.length > 0 || finished.length > 0;

  return (
    <>
      <SiteHeader />

      <ViewTracker
        event="my_learning_viewed"
        properties={{
          courses_in_progress: inProgress.length,
          courses_completed: finished.length,
          lessons_completed: lessonsCompleted,
        }}
      />

      <main className="flex-1">
        <div className={`${columnClassName} pt-10 pb-24`}>
          <h1 className="font-display text-[2.25rem] leading-[1.15] font-bold text-neutral-900">
            My Learning
          </h1>
          <p className="mt-3 text-body-lg text-neutral-500">
            {hasProgress
              ? "Pick up where you left off."
              : "Start a course and it will show up here."}
          </p>

          {hasProgress ? (
            <LearningSummary
              stats={[
                {
                  icon: "play-circle",
                  label: "In progress",
                  value: pluralize(inProgress.length, "course"),
                },
                {
                  icon: "check-circle",
                  label: "Lessons completed",
                  value: pluralize(lessonsCompleted, "lesson"),
                },
                {
                  icon: "clock",
                  label: "Time watched",
                  value: formatDuration(secondsWatched),
                },
                ...(bookmarks.length + courseBookmarks.length > 0
                  ? [
                      {
                        icon: "bookmark" as const,
                        label: "Bookmarked",
                        value: pluralize(bookmarks.length + courseBookmarks.length, "item"),
                      },
                    ]
                  : []),
                ...(notesWritten > 0
                  ? [
                      {
                        icon: "file-text" as const,
                        label: "Notes",
                        value: pluralize(notesWritten, "lesson"),
                      },
                    ]
                  : []),
              ]}
            />
          ) : null}

          {bookmarks.length > 0 || courseBookmarks.length > 0 ? (
            <BookmarkedLessons courses={courseBookmarks} lessons={bookmarks} />
          ) : null}

          {inProgress.length > 0 ? (
            <Section title="Continue Learning" courses={inProgress.map((item) => item.card)} />
          ) : null}

          {finished.length > 0 ? (
            <Section title="Completed" courses={finished.map((item) => item.card)} />
          ) : null}

          {notStarted.length > 0 ? (
            <Section
              title={hasProgress ? "Not started yet" : "Start a course"}
              courses={notStarted.map((item) => item.card)}
            />
          ) : null}

          {scored.length === 0 ? (
            <div className="mt-10 rounded-lg border border-neutral-200 bg-white px-7 py-10 text-center shadow-sm">
              <p className="text-body-lg text-neutral-700">
                There are no courses published yet.
              </p>
              <Link
                href="/courses"
                className={buttonClassName({ size: "cta", className: "mt-6" })}
              >
                Browse the catalog
                <Icon name="arrow-right" size={20} />
              </Link>
            </div>
          ) : null}
        </div>
      </main>
    </>
  );
}

/** One titled grid of course cards. Two columns on desktop, one on mobile. */
function Section({ title, courses }: { title: string; courses: LearningCourse[] }) {
  return (
    <section className="mt-12">
      <h2 className="font-display text-heading-1 font-medium text-neutral-900">{title}</h2>
      <ul className="mt-5 grid gap-6 sm:grid-cols-2">
        {courses.map((course) => (
          <li key={course._id} className="flex">
            <div className="w-full">
              <LearningCourseCard course={course} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
