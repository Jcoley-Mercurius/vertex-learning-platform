"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import posthog from "posthog-js";
import { SignInButton } from "@clerk/nextjs";

import { useProgress } from "@/components/progress";
import { MAX_NOTE_LENGTH } from "@/lib/progress";
import { buttonClassName, cn } from "@/components/ui";

/**
 * The learner's own notes for one lesson.
 *
 * Plain text, not Portable Text: this is app state, not authored content, so it
 * is stored as text and rendered as text — there is no markup path here and
 * nothing to sanitise (AGENTS.md section 7).
 *
 * Saving is debounced, then flushed on blur and on `pagehide`, so a learner who
 * closes the tab mid-sentence still keeps the sentence. The write goes through
 * `/api/progress` like every other learner write.
 */

const DEBOUNCE_MS = 1_500;

type SaveState = "idle" | "saving" | "saved";

export function LessonNotes({
  lessonId,
  lessonTitle,
}: {
  lessonId: string;
  lessonTitle: string;
}) {
  const { loaded, signedIn, byLesson, save } = useProgress();
  const fieldId = useId();

  const stored = byLesson.get(lessonId)?.note ?? "";
  const [draft, setDraft] = useState(stored);
  const [seeded, setSeeded] = useState(stored);
  const [dirty, setDirty] = useState(false);
  const [state, setState] = useState<SaveState>("idle");

  /* The provider's fetch settles after this mounts, so the stored note arrives
     late. It is adopted during render rather than in an effect, and only while
     the learner has not typed — an edit in flight is never overwritten by the
     fetch that started before it. */
  if (!dirty && stored !== seeded) {
    setSeeded(stored);
    setDraft(stored);
  }

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /* The draft and the unsaved flag as the debounce, the unmount and the
     `pagehide` flush see them: all three run outside render, where the state
     they closed over may already be stale. */
  const latest = useRef(draft);
  const unsaved = useRef(false);

  useEffect(() => {
    latest.current = draft;
  }, [draft]);

  const flush = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }

    /* A blur with nothing typed is not a save: it must not fire an event or a
       request. */
    if (!unsaved.current) return;

    const note = latest.current;
    unsaved.current = false;
    setDirty(false);
    setState("saving");

    posthog.capture("lesson_note_saved", {
      lesson_id: lessonId,
      lesson_title: lessonTitle,
      /* The note text itself never leaves the browser as an event property. */
      note_length: note.length,
      cleared: note.trim().length === 0,
    });

    void save({ lessonId, note }).then(() => setState("saved"));
  }, [lessonId, lessonTitle, save]);

  /* The last edit of a visit goes out during `pagehide`, where the provider's
     `keepalive` fetch survives the document being torn down. */
  useEffect(() => {
    const onHide = () => flush();
    window.addEventListener("pagehide", onHide);

    return () => {
      window.removeEventListener("pagehide", onHide);
      flush();
    };
  }, [flush]);

  if (loaded && !signedIn) {
    return (
      <div className="py-10">
        <p className="text-body-lg text-neutral-700">
          Keep your own notes on this lesson.
        </p>
        <p className="mt-2 text-body text-neutral-500">
          Notes are saved to your account, so they follow you between devices.
        </p>
        <SignInButton mode="modal">
          <button type="button" className={buttonClassName({ size: "md", className: "mt-6" })}>
            Sign in to take notes
          </button>
        </SignInButton>
      </div>
    );
  }

  const remaining = MAX_NOTE_LENGTH - draft.length;

  return (
    <div className="py-10">
      <label htmlFor={fieldId} className="text-body-lg font-medium text-neutral-900">
        Your notes
      </label>
      <p className="mt-1 text-body text-neutral-500">
        Only you can see these. They save as you type.
      </p>

      <textarea
        id={fieldId}
        value={draft}
        maxLength={MAX_NOTE_LENGTH}
        rows={10}
        disabled={!loaded}
        placeholder="What do you want to remember from this lesson?"
        onChange={(event) => {
          setDraft(event.target.value);
          /* `latest` is what the flush reads, and the effect that mirrors it
             has not run yet when a `pagehide` lands in the same tick. */
          latest.current = event.target.value;
          unsaved.current = true;
          setDirty(true);
          setState("idle");

          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(flush, DEBOUNCE_MS);
        }}
        onBlur={flush}
        className={cn(
          "mt-5 w-full resize-y rounded-md border border-neutral-200 bg-white px-4 py-3",
          "text-body leading-[1.8] text-neutral-900 placeholder:text-neutral-400",
          "focus-visible:border-primary-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400",
          !loaded && "opacity-60",
        )}
      />

      <div className="mt-3 flex items-center justify-between gap-4 text-small text-neutral-500">
        <p aria-live="polite">
          {state === "saving" ? "Saving…" : state === "saved" ? "Saved" : ""}
        </p>
        {remaining <= 500 ? (
          <p>{remaining} characters left</p>
        ) : null}
      </div>
    </div>
  );
}
