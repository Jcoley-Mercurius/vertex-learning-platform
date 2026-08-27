"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@clerk/nextjs";

import {
  EMPTY_PROGRESS,
  bookmarkedCourseIds,
  completedLessonIds,
  lessonProgressById,
  type LessonProgress,
  type ProgressState,
} from "@/lib/progress";

/**
 * The learner's progress, fetched once and shared.
 *
 * The catalog, the course page and the lesson page are all statically
 * prerendered, and they stay that way: none of them reads the session on the
 * server. They render the zero state, and this provider overlays the signed-in
 * learner's marks after hydration from a single `GET /api/progress`.
 *
 * A signed-out visitor makes no request at all — the fetch is gated on Clerk
 * having loaded and reporting a session. `/my-learning` does not use any of
 * this: it is dynamic by nature and reads progress on the server.
 */

type ProgressContextValue = {
  /** `false` until the first fetch settles, so marks never flash in and out. */
  loaded: boolean;
  signedIn: boolean;
  completed: Set<string>;
  byLesson: Map<string, LessonProgress>;
  /** The courses the learner has saved, for the course hero's toggle. */
  bookmarkedCourses: Set<string>;
  /**
   * Records one lesson's state. Every field but the id is optional and *absent
   * means unchanged*, so the player, the bookmark and the notes editor can each
   * write their own field without disturbing the others.
   */
  save: (update: {
    lessonId: string;
    positionSeconds?: number;
    completed?: boolean;
    bookmarked?: boolean;
    note?: string;
  }) => Promise<void>;
  /** Saves or clears a course bookmark. Same route, different array. */
  saveCourseBookmark: (update: {
    courseId: string;
    bookmarked: boolean;
  }) => Promise<void>;
};

const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const [fetched, setFetched] = useState<ProgressState | null>(null);
  /* Guards React's development double mount and any re-render of the provider. */
  const requested = useRef(false);

  /* Signing out is handled here rather than by resetting state in an effect: the
     marks belong to the session, so a provider with no session simply has none. */
  const progress = isSignedIn && fetched ? fetched : EMPTY_PROGRESS;
  const loaded = isLoaded && (!isSignedIn || fetched !== null);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      /* Ready to fetch again if this browser signs back in. */
      requested.current = false;
      return;
    }

    if (requested.current) return;
    requested.current = true;

    let active = true;

    fetch("/api/progress")
      .then((response) => (response.ok ? response.json() : EMPTY_PROGRESS))
      .then((data: ProgressState) => {
        if (active) setFetched(data);
      })
      .catch(() => {
        /* Progress is an overlay on content that has already rendered. A failed
           fetch leaves the zero state, it does not break the page. */
        if (active) setFetched(EMPTY_PROGRESS);
      });

    return () => {
      active = false;
    };
  }, [isLoaded, isSignedIn]);

  /**
   * Writes one lesson's state and mirrors it locally, so the sidebar's mark
   * appears the moment the video ends rather than on the next navigation. The
   * server is still the authority: its response replaces the optimistic value.
   */
  const save = useCallback<ProgressContextValue["save"]>(
    async ({ lessonId, positionSeconds, completed = false, bookmarked, note }) => {
      if (!isSignedIn) return;

      const now = new Date().toISOString();

      setFetched((current) => {
        const state = current ?? EMPTY_PROGRESS;
        const rest = state.lessons.filter((lesson) => lesson.lessonId !== lessonId);
        const previous = state.lessons.find((lesson) => lesson.lessonId === lessonId);
        const trimmed = note?.trim() ?? null;
        const nextBookmarked = bookmarked ?? previous?.bookmarked ?? false;

        return {
          ...state,
          /* Mirrors the server's merge: anything this call left out keeps the
             value it already had. */
          lessons: [
            ...rest,
            {
              lessonId,
              lessonSlug: previous?.lessonSlug ?? null,
              lessonTitle: previous?.lessonTitle ?? null,
              lessonDurationSeconds: previous?.lessonDurationSeconds ?? 0,
              completed: completed || (previous?.completed ?? false),
              positionSeconds: positionSeconds ?? previous?.positionSeconds ?? 0,
              bookmarked: nextBookmarked,
              bookmarkedAt: nextBookmarked ? (previous?.bookmarkedAt ?? now) : null,
              note: note === undefined ? (previous?.note ?? null) : trimmed || null,
              noteUpdatedAt: note === undefined ? (previous?.noteUpdatedAt ?? null) : now,
              completedAt: previous?.completedAt ?? (completed ? now : null),
              updatedAt: now,
            },
          ],
        };
      });

      try {
        await fetch("/api/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lessonId,
            completed,
            ...(positionSeconds === undefined ? {} : { positionSeconds }),
            ...(bookmarked === undefined ? {} : { bookmarked }),
            ...(note === undefined ? {} : { note }),
          }),
          /* The last write of a visit goes out during `pagehide`, when a normal
             fetch would be cancelled with the document. */
          keepalive: true,
        });
      } catch {
        /* A dropped progress write is not worth interrupting the learner for;
           the next tick writes the same position again. */
      }
    },
    [isSignedIn],
  );

  /** The course-level twin of `save`, mirrored locally the same way. */
  const saveCourseBookmark = useCallback<ProgressContextValue["saveCourseBookmark"]>(
    async ({ courseId, bookmarked }) => {
      if (!isSignedIn) return;

      const now = new Date().toISOString();

      setFetched((current) => {
        const state = current ?? EMPTY_PROGRESS;
        const rest = state.bookmarkedCourses.filter((course) => course.courseId !== courseId);
        const previous = state.bookmarkedCourses.find((course) => course.courseId === courseId);

        return {
          ...state,
          bookmarkedCourses: bookmarked
            ? [
                ...rest,
                {
                  courseId,
                  courseTitle: previous?.courseTitle ?? null,
                  courseSlug: previous?.courseSlug ?? null,
                  bookmarkedAt: previous?.bookmarkedAt ?? now,
                },
              ]
            : rest,
        };
      });

      try {
        await fetch("/api/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseId, bookmarked }),
          keepalive: true,
        });
      } catch {
        /* As with a progress write: not worth interrupting the learner for. */
      }
    },
    [isSignedIn],
  );

  const value = useMemo<ProgressContextValue>(
    () => ({
      loaded,
      signedIn: Boolean(isSignedIn),
      completed: completedLessonIds(progress),
      byLesson: lessonProgressById(progress),
      bookmarkedCourses: bookmarkedCourseIds(progress),
      save,
      saveCourseBookmark,
    }),
    [isSignedIn, loaded, progress, save, saveCourseBookmark],
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

/**
 * Progress as the pages see it. Safe outside the provider — a component that
 * renders without one simply sees the zero state, which is what the server
 * rendered anyway.
 */
export function useProgress(): ProgressContextValue {
  const value = useContext(ProgressContext);

  return (
    value ?? {
      loaded: false,
      signedIn: false,
      completed: new Set<string>(),
      byLesson: new Map<string, LessonProgress>(),
      bookmarkedCourses: new Set<string>(),
      save: async () => {},
      saveCourseBookmark: async () => {},
    }
  );
}
