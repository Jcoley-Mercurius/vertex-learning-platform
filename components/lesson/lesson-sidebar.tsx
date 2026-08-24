"use client";

import Link from "next/link";
import { useId, useState } from "react";
import posthog from "posthog-js";

import { CourseGlyph, type CourseGlyphName } from "@/components/site";
import { Icon, ProgressBar, cn } from "@/components/ui";
import { formatDuration } from "@/lib/format";

export type SidebarLesson = {
  _id: string;
  title: string;
  href: string | null;
  durationSeconds: number;
  current: boolean;
  completed: boolean;
};

export type SidebarModule = {
  _key: string;
  title: string;
  durationSeconds: number;
  lessons: SidebarLesson[];
  /** True for the module that owns the lesson being watched. */
  current: boolean;
  completed: boolean;
};

/**
 * The curriculum rail from `design/vertex-lesson.png`: back link, course tile
 * with progress, and the module accordion with the current module expanded and
 * the current lesson marked "Now playing".
 *
 * Completion marks and the percentage are driven by props. Progress has no
 * backend yet (no progress document, no write route), so the page passes the
 * zero state today — the same precedent `CourseProgress` set.
 */
export function LessonSidebar({
  courseTitle,
  courseHref,
  glyph,
  percentComplete,
  modules,
}: {
  courseTitle: string;
  courseHref: string;
  glyph: CourseGlyphName;
  percentComplete: number;
  modules: SidebarModule[];
}) {
  const panelId = useId();
  const currentIndex = Math.max(
    0,
    modules.findIndex((module) => module.current),
  );
  const [openKeys, setOpenKeys] = useState<string[]>(
    modules[currentIndex] ? [modules[currentIndex]._key] : [],
  );
  /* There is no room for the rail below `lg`, so it collapses behind a
     disclosure above the lesson (AGENTS.md section 3). */
  const [mobileOpen, setMobileOpen] = useState(false);
  const railId = `${panelId}-rail`;

  const toggle = (key: string) => {
    setOpenKeys((keys) =>
      keys.includes(key) ? keys.filter((k) => k !== key) : [...keys, key],
    );
  };

  return (
    <div className="lg:sticky lg:top-8">
      <button
        type="button"
        aria-expanded={mobileOpen}
        aria-controls={railId}
        onClick={() => setMobileOpen((open) => !open)}
        className={cn(
          "flex w-full items-center justify-between gap-4 rounded-md border border-neutral-200 bg-white px-5 py-3",
          "text-body-lg text-neutral-900 lg:hidden",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400",
        )}
      >
        Course content
        <Icon
          name="chevron-down"
          size={20}
          className={cn("text-neutral-500 transition-transform", mobileOpen && "rotate-180")}
        />
      </button>

      <div id={railId} className={cn(mobileOpen ? "mt-6 block" : "hidden", "lg:mt-0 lg:block")}>
        <Link
          href={courseHref}
          className={cn(
            "inline-flex items-center gap-3 rounded-xs font-display text-heading-3 font-medium",
            "text-primary-500 transition-colors hover:text-[#ea580c]",
            "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-400",
          )}
        >
          <Icon name="arrow-right" size={20} className="rotate-180" />
          Back to course
        </Link>

        <div className="mt-7 flex items-start gap-4 pb-7">
          <span className="h-14 w-14 shrink-0 overflow-hidden rounded-md">
            <CourseGlyph name={glyph} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-body-lg font-medium text-neutral-900">{courseTitle}</p>
            <p className="mt-1 text-body text-neutral-500">{percentComplete}% complete</p>
            <ProgressBar value={percentComplete} showLabel={false} className="mt-2" />
          </div>
        </div>

        <div className="border-t border-neutral-200">
          <p className="py-4 text-body-lg text-neutral-900">
            Module {currentIndex + 1} of {modules.length}
          </p>
        </div>

        <ol className="border-t border-neutral-200">
          {modules.map((module, moduleIndex) => {
            const open = openKeys.includes(module._key);
            const id = `${panelId}-${module._key}`;

            return (
              <li
                key={module._key}
                className={cn(
                  "relative border-b border-neutral-200",
                  module.current && "bg-primary-100/40",
                )}
              >
                {/* The timeline rule behind the numbered circles, as on the course page. */}
                <span
                  aria-hidden
                  className={cn(
                    "absolute left-[2.125rem] w-px bg-neutral-200",
                    moduleIndex === 0 ? "top-8" : "top-0",
                    moduleIndex === modules.length - 1 && !open ? "h-0" : "bottom-0",
                  )}
                />

                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={id}
                  onClick={() => toggle(module._key)}
                  className={cn(
                    "relative flex w-full items-center gap-4 px-5 py-4 text-left",
                    "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-400",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-body",
                      module.current
                        ? "border-primary-500 bg-primary-500 font-medium text-white"
                        : "border-neutral-200 bg-white text-neutral-900",
                    )}
                  >
                    {moduleIndex + 1}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block text-body-lg text-neutral-900",
                        module.current && "font-medium",
                      )}
                    >
                      {module.title}
                    </span>
                    <span className="mt-0.5 block text-body text-neutral-500">
                      {formatDuration(module.durationSeconds)}
                    </span>
                  </span>

                  {module.completed ? (
                    <Icon name="check-circle" size={20} className="shrink-0 text-primary-500" />
                  ) : (
                    <Icon
                      name="chevron-down"
                      size={20}
                      className={cn(
                        "shrink-0 text-neutral-500 transition-transform",
                        open && "rotate-180",
                      )}
                    />
                  )}
                </button>

                <ul id={id} hidden={!open} className="relative pb-3">
                  {module.lessons.map((lesson) => {
                    const row = (
                      <>
                        <span
                          aria-hidden
                          className={cn(
                            "mt-2 ml-[1.6875rem] h-2.5 w-2.5 shrink-0 rounded-full border",
                            lesson.current
                              ? "border-primary-500 bg-primary-500"
                              : "border-neutral-300 bg-white",
                          )}
                        />
                        <span className="min-w-0 flex-1">
                          <span
                            className={cn(
                              "block text-body-lg",
                              lesson.current ? "font-medium text-neutral-900" : "text-neutral-700",
                            )}
                          >
                            {lesson.title}
                          </span>
                          <span
                            className={cn(
                              "mt-0.5 block text-body",
                              lesson.current ? "text-primary-500" : "text-neutral-500",
                            )}
                          >
                            {lesson.current
                              ? "Now playing"
                              : formatDuration(lesson.durationSeconds)}
                          </span>
                        </span>
                        {lesson.current ? (
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-500 text-white">
                            <Icon name="play" variant="filled" size={12} className="ml-0.5" />
                          </span>
                        ) : lesson.completed ? (
                          <Icon
                            name="check-circle"
                            size={18}
                            className="shrink-0 text-primary-500"
                          />
                        ) : null}
                      </>
                    );

                    return (
                      <li key={lesson._id}>
                        {lesson.href && !lesson.current ? (
                          <Link
                            href={lesson.href}
                            onClick={() =>
                              posthog.capture("lesson_clicked", {
                                lesson_title: lesson.title,
                                module_title: module.title,
                                source: "lesson_sidebar",
                              })
                            }
                            className={cn(
                              "flex items-start gap-4 px-5 py-2.5 transition-colors hover:bg-neutral-100",
                              "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-400",
                            )}
                          >
                            {row}
                          </Link>
                        ) : (
                          <span
                            aria-current={lesson.current ? "true" : undefined}
                            className="flex items-start gap-4 px-5 py-2.5"
                          >
                            {row}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
