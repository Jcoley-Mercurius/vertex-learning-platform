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
  /** Records a position, and optionally a completion, for one lesson. */
  save: (update: {
    lessonId: string;
    positionSeconds?: number;
    completed?: boolean;
  }) => Promise<void>;
};

const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const [fetched, setFetched] = useState<ProgressState | null>(null);
  /* Guards React's development double mount and any re-render of the provider. */
  const requested = useRef(false);
  /* Monotonically increasing revision for ordering concurrent progress writes. */
  const clientRevision = useRef(0);

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
    async ({ lessonId, positionSeconds = 0, completed = false }) => {
      if (!isSignedIn) return;

      // Increment client revision for ordering
      clientRevision.current += 1;
      const revision = clientRevision.current;

      setFetched((current) => {
        const state = current ?? EMPTY_PROGRESS;
        const rest = state.lessons.filter((lesson) => lesson.lessonId !== lessonId);
        const previous = state.lessons.find((lesson) => lesson.lessonId === lessonId);

        return {
          ...state,
          lessons: [
            ...rest,
            {
              lessonId,
              lessonSlug: previous?.lessonSlug ?? null,
              completed: completed || (previous?.completed ?? false),
              positionSeconds,
              updatedAt: new Date().toISOString(),
            },
          ],
        };
      });

      try {
        const response = await fetch("/api/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lessonId, positionSeconds, completed, clientRevision: revision }),
          /* The last write of a visit goes out during `pagehide`, when a normal
             fetch would be cancelled with the document. */
          keepalive: true,
        });

        if (!response.ok) {
          // On error, reconcile with server state
          const freshProgress = await fetch("/api/progress").then((r) =>
            r.ok ? r.json() : EMPTY_PROGRESS,
          );
          setFetched(freshProgress);
        }
      } catch {
        /* A dropped progress write is not worth interrupting the learner for;
           the next tick writes the same position again. On actual network errors,
           we don't reconcile since we can't reach the server anyway. */
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
      save,
    }),
    [isSignedIn, loaded, progress, save],
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
      save: async () => {},
    }
  );
}
