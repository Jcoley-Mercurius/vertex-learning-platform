"use client";

import { useState } from "react";
import posthog from "posthog-js";
import { SignInButton } from "@clerk/nextjs";

import { useProgress } from "@/components/progress";
import { Icon, buttonClassName } from "@/components/ui";

/**
 * The course hero's Bookmark, saving the whole course.
 *
 * The lesson page's square toggles one lesson; this saves the course itself, so
 * it writes `bookmarkedCourses` rather than a flag on a lesson.
 *
 * The course page stays prerendered: this renders the zero state on the server
 * and fills in once `useProgress()` has the learner's own state, the same
 * overlay the progress band uses. Signed-out visitors get Clerk's modal rather
 * than a dead control, and the write goes through `/api/progress`.
 */
export function CourseBookmarkButton({
  courseId,
  courseTitle,
}: {
  courseId: string;
  courseTitle: string;
}) {
  const { loaded, signedIn, bookmarkedCourses, saveCourseBookmark } = useProgress();
  /* Held locally so the label flips on click rather than on the round trip. */
  const [pending, setPending] = useState<boolean | null>(null);

  const bookmarked = pending ?? bookmarkedCourses.has(courseId);

  if (loaded && !signedIn) {
    return (
      <SignInButton mode="modal">
        <button
          type="button"
          title="Sign in to bookmark this course"
          className={buttonClassName({ variant: "tertiary", size: "cta" })}
        >
          <Icon name="bookmark" size={20} />
          Bookmark
        </button>
      </SignInButton>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={bookmarked}
      /* `aria-disabled` rather than `disabled`: the tertiary button's disabled
         variant greys it out, and this renders on the server before the
         learner's state has loaded — the reference shows a white button, not a
         grey one, so it stays styled and simply ignores the click. */
      aria-disabled={!loaded}
      onClick={() => {
        if (!loaded) return;

        const next = !bookmarked;
        setPending(next);

        posthog.capture(next ? "course_bookmarked" : "course_unbookmarked", {
          course_id: courseId,
          course_title: courseTitle,
        });

        void saveCourseBookmark({ courseId, bookmarked: next });
      }}
      className={buttonClassName({
        variant: "tertiary",
        size: "cta",
        className: bookmarked ? "border-primary-500 bg-primary-100 text-primary-500" : "",
      })}
    >
      <Icon name="bookmark" variant={bookmarked ? "filled" : "outline"} size={20} />
      {bookmarked ? "Bookmarked" : "Bookmark"}
    </button>
  );
}
