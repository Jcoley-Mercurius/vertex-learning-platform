"use client";

import { useState } from "react";
import posthog from "posthog-js";
import { SignInButton } from "@clerk/nextjs";

import { useProgress } from "@/components/progress";
import { Icon, cn } from "@/components/ui";

/**
 * The bookmark square from `design/vertex-lesson.png`, now a real toggle.
 *
 * The lesson page stays prerendered, so this renders the zero state on the
 * server and fills in once `useProgress()` has the learner's own state — the
 * same overlay the sidebar's completion marks use. A signed-out visitor gets
 * Clerk's modal rather than a dead control.
 *
 * The write goes through `/api/progress`; the browser holds no token and never
 * writes Sanity directly (AGENTS.md section 5).
 */

const squareClassName = cn(
  "mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-md border bg-white",
  "transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400",
);

export function BookmarkButton({
  lessonId,
  lessonTitle,
  courseTitle,
}: {
  lessonId: string;
  lessonTitle: string;
  courseTitle: string;
}) {
  const { loaded, signedIn, byLesson, save } = useProgress();
  /* Held locally so the icon fills on click rather than on the round trip. */
  const [pending, setPending] = useState<boolean | null>(null);

  const stored = byLesson.get(lessonId)?.bookmarked ?? false;
  const bookmarked = pending ?? stored;

  if (loaded && !signedIn) {
    return (
      <SignInButton mode="modal">
        <button
          type="button"
          aria-label="Sign in to bookmark this lesson"
          title="Sign in to bookmark this lesson"
          className={cn(squareClassName, "border-neutral-200 text-neutral-400 hover:bg-neutral-100")}
        >
          <Icon name="bookmark" size={20} />
        </button>
      </SignInButton>
    );
  }

  return (
    <button
      type="button"
      aria-label={bookmarked ? "Remove bookmark" : "Bookmark this lesson"}
      aria-pressed={bookmarked}
      disabled={!loaded}
      onClick={() => {
        const next = !bookmarked;
        setPending(next);

        posthog.capture(next ? "lesson_bookmarked" : "lesson_unbookmarked", {
          lesson_id: lessonId,
          lesson_title: lessonTitle,
          course_title: courseTitle,
        });

        void save({ lessonId, bookmarked: next });
      }}
      className={cn(
        squareClassName,
        bookmarked
          ? "border-primary-500 bg-primary-100 text-primary-500"
          : "border-neutral-200 text-primary-500 hover:bg-primary-100",
        !loaded && "opacity-60",
      )}
    >
      <Icon name="bookmark" variant={bookmarked ? "filled" : "outline"} size={20} />
    </button>
  );
}
