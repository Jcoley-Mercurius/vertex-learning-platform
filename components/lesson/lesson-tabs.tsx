"use client";

import { useId, useState, type ReactNode } from "react";
import posthog from "posthog-js";

import { LessonNotes } from "./lesson-notes";
import { cn } from "@/components/ui";

type TabId = "content" | "notes";

/**
 * The `Lesson Content` / `Notes` pair. Only the switching lives on the client:
 * both panels are rendered on the server and passed in as props, so the notes
 * Portable Text never ships as data to the browser.
 *
 * The Notes tab holds the learner's own notes, which are per-learner app state
 * rather than content: it hydrates from the progress provider and autosaves
 * through `/api/progress`.
 */
export function LessonTabs({
  content,
  lessonId,
  lessonTitle,
}: {
  content: ReactNode;
  lessonId: string;
  lessonTitle: string;
}) {
  const baseId = useId();
  const [active, setActive] = useState<TabId>("content");

  const tabs: { id: TabId; label: string }[] = [
    { id: "content", label: "Lesson Content" },
    { id: "notes", label: "Notes" },
  ];

  return (
    <section className="mt-10">
      <div role="tablist" aria-label="Lesson" className="flex items-center gap-8 border-b border-neutral-200">
        {tabs.map((tab) => {
          const selected = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`${baseId}-${tab.id}-tab`}
              aria-selected={selected}
              aria-controls={`${baseId}-${tab.id}-panel`}
              onClick={() => {
                setActive(tab.id);
                posthog.capture("lesson_tab_selected", {
                  tab: tab.id,
                  lesson_title: lessonTitle,
                });
              }}
              className={cn(
                "-mb-px border-b-2 pb-3 text-body-lg transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400",
                selected
                  ? "border-primary-500 font-medium text-primary-500"
                  : "border-transparent text-neutral-500 hover:text-neutral-900",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`${baseId}-content-panel`}
        aria-labelledby={`${baseId}-content-tab`}
        hidden={active !== "content"}
      >
        {content}
      </div>

      <div
        role="tabpanel"
        id={`${baseId}-notes-panel`}
        aria-labelledby={`${baseId}-notes-tab`}
        hidden={active !== "notes"}
      >
        <LessonNotes lessonId={lessonId} lessonTitle={lessonTitle} />
      </div>
    </section>
  );
}
