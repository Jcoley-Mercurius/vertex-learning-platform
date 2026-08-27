/**
 * Notifications, derived (AGENTS.md section 7).
 *
 * Nothing here is stored. There is no notification document, no fan-out when a
 * course is published, and no feed to keep in sync — every item is computed per
 * request by intersecting the catalog with one learner's progress, the same way
 * percentages and lesson numbers are derived rather than authored.
 *
 * The one thing that *is* stored is `notificationsReadAt` on the learner's
 * progress document. Because every item carries a real timestamp from the data
 * it was derived from, "unread" is a single comparison against it, and marking
 * the feed read is a single field write.
 *
 * Pure: no Sanity client, no Clerk, no React. Shared by the notifications route
 * and safe to unit test.
 */

import {
  completedLessonIds,
  lessonProgressById,
  type ProgressState,
} from "@/lib/progress";

/** The kinds of thing worth telling a learner about, in the app as it exists. */
export type NotificationKind =
  | "new-course"
  | "new-lessons"
  | "resume-course"
  | "course-completed"
  | "bookmark-reminder";

export type Notification = {
  /** Stable across requests, so the client can key a list it re-fetches. */
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  href: string;
  /** ISO. Both the sort key and what `notificationsReadAt` is compared against. */
  timestamp: string;
  read: boolean;
};

/** The catalog skeleton `NOTIFICATIONS_CATALOG_QUERY` returns, loosely typed. */
export type NotificationCourse = {
  _id: string;
  _createdAt: string;
  title: string | null;
  slug: string | null;
  lessons: ({
    _id: string;
    _createdAt: string;
    title: string | null;
    slug: string | null;
  } | null)[] | null;
};

/** A course or lesson stops being "new" after this long. */
const NEW_WINDOW_DAYS = 30;
/** How long a started course, or a bookmark, has to sit before it is a nudge. */
const STALE_DAYS = 3;
/** The feed is a glance, not an archive. */
const MAX_NOTIFICATIONS = 20;

const DAY_MS = 86_400_000;

function daysBetween(later: number, earlier: string | null): number {
  if (!earlier) return Number.POSITIVE_INFINITY;
  const parsed = Date.parse(earlier);
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : (later - parsed) / DAY_MS;
}

/** The most recent of a set of ISO timestamps, ignoring the ones that are absent. */
function latest(timestamps: (string | null)[]): string | null {
  return timestamps.filter((value): value is string => Boolean(value)).sort().pop() ?? null;
}

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

/**
 * One learner's feed, newest first.
 *
 * Every item is grounded in a document that resolved: a course with a slug, or a
 * lesson the learner actually has state for. A course with no slug has nowhere
 * to link to, so it produces nothing rather than a dead card.
 */
export function deriveNotifications(
  progress: ProgressState,
  catalog: NotificationCourse[],
  now: Date = new Date(),
): Notification[] {
  const nowMs = now.getTime();
  const completed = completedLessonIds(progress);
  const byLesson = lessonProgressById(progress);
  const items: Notification[] = [];

  for (const course of catalog) {
    if (!course.slug) continue;

    const courseHref = `/courses/${course.slug}`;
    const courseTitle = course.title ?? "Untitled course";
    const lessons = (course.lessons ?? []).filter((lesson) => lesson !== null);
    const states = lessons.map((lesson) => byLesson.get(lesson._id) ?? null);
    const started = states.some((state) => state !== null);
    const done = lessons.length > 0 && lessons.every((lesson) => completed.has(lesson._id));

    /* A course published recently that this learner has not opened. Untouched is
       the point: a course already underway is a resume nudge, not news. */
    if (!started && daysBetween(nowMs, course._createdAt) <= NEW_WINDOW_DAYS) {
      items.push({
        id: `new-course:${course._id}`,
        kind: "new-course",
        title: "New course",
        body: `${courseTitle} just landed in the catalog.`,
        href: courseHref,
        timestamp: course._createdAt,
        read: false,
      });
    }

    /* Lessons added to something the learner is already working through. The
       timestamp is the newest of them, so one batch reads as one notification. */
    if (started) {
      const fresh = lessons.filter(
        (lesson) => daysBetween(nowMs, lesson._createdAt) <= NEW_WINDOW_DAYS,
      );

      if (fresh.length > 0) {
        const newest = latest(fresh.map((lesson) => lesson._createdAt));
        const target = fresh.find((lesson) => lesson.slug);

        if (newest) {
          items.push({
            id: `new-lessons:${course._id}`,
            kind: "new-lessons",
            title: "New lessons",
            body:
              fresh.length === 1
                ? `${fresh[0].title ?? "A new lesson"} was added to ${courseTitle}.`
                : `${plural(fresh.length, "lesson")} were added to ${courseTitle}.`,
            href: fresh.length === 1 && target?.slug ? `/lessons/${target.slug}` : courseHref,
            timestamp: newest,
            read: false,
          });
        }
      }
    }

    const activity = latest(states.map((state) => state?.updatedAt ?? null));

    /* Underway, unfinished, and quiet for a while. The timestamp is that last
       bit of activity, so watching another lesson makes this unread again. */
    if (started && !done && activity && daysBetween(nowMs, activity) >= STALE_DAYS) {
      const next = lessons.find((lesson) => !completed.has(lesson._id) && lesson.slug);

      items.push({
        id: `resume-course:${course._id}`,
        kind: "resume-course",
        title: "Pick up where you left off",
        body: next?.title
          ? `You left ${courseTitle} at ${next.title}.`
          : `You have not been back to ${courseTitle} in a while.`,
        href: next?.slug ? `/lessons/${next.slug}` : courseHref,
        timestamp: activity,
        read: false,
      });
    }

    if (done) {
      const finishedAt = latest(states.map((state) => state?.completedAt ?? state?.updatedAt ?? null));

      if (finishedAt) {
        items.push({
          id: `course-completed:${course._id}`,
          kind: "course-completed",
          title: "Course complete",
          body: `You finished every lesson in ${courseTitle}. Nice work.`,
          href: courseHref,
          timestamp: finishedAt,
          read: false,
        });
      }
    }
  }

  /* Bookmarks are learner state, so they come from progress rather than the
     catalog walk — a bookmarked lesson whose course fell outside the recent
     window still deserves its nudge. */
  for (const lesson of progress.lessons) {
    if (!lesson.bookmarked || lesson.completed || !lesson.bookmarkedAt) continue;
    if (daysBetween(nowMs, lesson.bookmarkedAt) < STALE_DAYS) continue;

    items.push({
      id: `bookmark-reminder:${lesson.lessonId}`,
      kind: "bookmark-reminder",
      title: "Saved for later",
      body: `${lesson.lessonTitle ?? "A lesson"} is still on your bookmarks.`,
      href: lesson.lessonSlug ? `/lessons/${lesson.lessonSlug}` : "/my-learning",
      timestamp: lesson.bookmarkedAt,
      read: false,
    });
  }

  const readAt = progress.notificationsReadAt ? Date.parse(progress.notificationsReadAt) : null;

  return items
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, MAX_NOTIFICATIONS)
    .map((item) => ({
      ...item,
      read: readAt !== null && !Number.isNaN(readAt) ? Date.parse(item.timestamp) <= readAt : false,
    }));
}

export function unreadCount(notifications: Notification[]): number {
  return notifications.filter((item) => !item.read).length;
}
