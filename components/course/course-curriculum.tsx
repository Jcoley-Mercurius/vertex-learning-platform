"use client";

import Link from "next/link";
import { useId, useState } from "react";
import posthog from "posthog-js";
import { useProgress } from "@/components/progress";
import { Badge, Icon, cn } from "@/components/ui";
import { formatDuration, lessonLabel, pluralize } from "@/lib/format";

export type CurriculumLesson = {
  _id: string;
  title: string;
  href: string | null;
  durationSeconds: number;
  freePreview: boolean;
};

export type CurriculumModule = {
  _key: string;
  title: string;
  summary: string | null;
  durationSeconds: number;
  lessons: CurriculumLesson[];
};

/** How many modules show before the "Show all" toggle appears, per the reference. */
const COLLAPSED_MODULES = 6;

/**
 * The "Course Content" list. This is the one client component on the page: it
 * owns which modules are expanded and whether the list is truncated, and nothing
 * else. All content arrives as props from the server component.
 *
 * Module numbers and lesson labels are positional (AGENTS.md section 7), so they
 * are derived here from array order rather than read from a field.
 *
 * Completion marks come from `useProgress()`, not from props: the course page is
 * statically prerendered and never reads the session, so the learner's marks are
 * overlaid here after hydration.
 */
export function CourseCurriculum({
  modules,
  durationSeconds,
}: {
  modules: CurriculumModule[];
  durationSeconds: number;
}) {
  const { completed } = useProgress();
  const panelId = useId();
  const [openKeys, setOpenKeys] = useState<string[]>([]);
  const [showAll, setShowAll] = useState(false);

  if (modules.length === 0) return null;

  const truncated = modules.length > COLLAPSED_MODULES;
  const visible = truncated && !showAll ? modules.slice(0, COLLAPSED_MODULES) : modules;

  const toggle = (key: string) => {
    const isOpening = !openKeys.includes(key);
    if (isOpening) {
      const mod = modules.find((m) => m._key === key);
      const modIndex = modules.findIndex((m) => m._key === key);
      if (mod) {
        posthog.capture("module_expanded", {
          module_title: mod.title,
          module_index: modIndex,
          lesson_count: mod.lessons.length,
        });
      }
    }
    setOpenKeys((keys) =>
      keys.includes(key) ? keys.filter((k) => k !== key) : [...keys, key],
    );
  };

  return (
    <section className="mt-14">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-display text-heading-1 font-medium text-neutral-900">
          Course Content
        </h2>
        <p className="text-body text-neutral-500">
          {pluralize(modules.length, "module")} &middot; {formatDuration(durationSeconds)}
        </p>
      </div>

      <ol className="mt-5 rounded-lg border border-neutral-200 bg-white">
        {visible.map((module, moduleIndex) => {
          const open = openKeys.includes(module._key);
          const id = `${panelId}-${module._key}`;
          const moduleCompleted =
            module.lessons.length > 0 &&
            module.lessons.every((lesson) => completed.has(lesson._id));

          return (
            <li
              key={module._key}
              className={cn(
                "relative px-6",
                moduleIndex > 0 && "border-t border-neutral-200",
              )}
            >
              {/* The timeline rule behind the numbered circles. It stops at the
                  first and last circle so the line never runs past the list. */}
              <span
                aria-hidden
                className={cn(
                  "absolute left-[2.625rem] w-px bg-neutral-200",
                  moduleIndex === 0 ? "top-9" : "top-0",
                  moduleIndex === visible.length - 1 ? "h-0" : "bottom-0",
                )}
              />

              <button
                type="button"
                aria-expanded={open}
                aria-controls={id}
                onClick={() => toggle(module._key)}
                className={cn(
                  "flex w-full items-center gap-5 py-4 text-left",
                  "rounded-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400",
                )}
              >
                <span
                  className={cn(
                    "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-body-lg",
                    moduleCompleted
                      ? "border-primary-500 bg-primary-500 text-white"
                      : "border-neutral-200 bg-white text-neutral-900",
                  )}
                >
                  {moduleCompleted ? (
                    <Icon name="check-circle" size={20} aria-label="Module complete" />
                  ) : (
                    moduleIndex + 1
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block font-display text-heading-3 font-medium text-neutral-900">
                    {module.title}
                  </span>
                  {module.summary ? (
                    <span className="mt-1 block text-body text-neutral-500">
                      {module.summary}
                    </span>
                  ) : null}
                </span>

                <span className="shrink-0 text-body text-neutral-500">
                  {formatDuration(module.durationSeconds)}
                </span>
                <Icon
                  name="chevron-down"
                  size={20}
                  className={cn(
                    "shrink-0 text-neutral-500 transition-transform",
                    open && "rotate-180",
                  )}
                />
              </button>

              <div id={id} hidden={!open} className="pb-4 pl-14">
                <ul className="border-t border-neutral-100 pt-2">
                  {module.lessons.map((lesson, lessonIndex) => {
                    const label = lessonLabel(moduleIndex, lessonIndex);
                    const lessonCompleted = completed.has(lesson._id);
                    const row = (
                      <>
                        {/* The completion mark replaces the play affordance, as
                            it does in the lesson sidebar. */}
                        <Icon
                          name={lessonCompleted ? "check-circle" : "play-circle"}
                          size={18}
                          className="shrink-0 text-primary-500"
                          aria-label={lessonCompleted ? "Completed" : undefined}
                        />
                        <span className="w-[4.75rem] shrink-0 text-body text-neutral-500">
                          {label}
                        </span>
                        <span className="min-w-0 flex-1 text-body-lg text-neutral-900">
                          {lesson.title}
                        </span>
                        {lesson.freePreview ? (
                          <Badge tone="lesson" className="shrink-0">
                            Free preview
                          </Badge>
                        ) : null}
                        <span className="shrink-0 text-body text-neutral-500">
                          {formatDuration(lesson.durationSeconds)}
                        </span>
                      </>
                    );

                    return (
                      <li key={lesson._id}>
                        {lesson.href ? (
                          <Link
                            href={lesson.href}
                            onClick={() =>
                              posthog.capture("lesson_clicked", {
                                lesson_title: lesson.title,
                                lesson_index: lessonIndex,
                                module_title: module.title,
                                module_index: moduleIndex,
                                free_preview: lesson.freePreview,
                                duration_seconds: lesson.durationSeconds,
                              })
                            }
                            className={cn(
                              "flex items-center gap-4 rounded-sm px-3 py-2 transition-colors hover:bg-neutral-100",
                              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400",
                            )}
                          >
                            {row}
                          </Link>
                        ) : (
                          <span className="flex items-center gap-4 px-3 py-2">{row}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </li>
          );
        })}
      </ol>

      {truncated ? (
        <div className="relative z-10 -mt-5.5 flex justify-center">
          <button
            type="button"
            aria-expanded={showAll}
            onClick={() => {
              const next = !showAll;
              posthog.capture("curriculum_show_all_toggled", {
                expanded: next,
                total_modules: modules.length,
              });
              setShowAll(next);
            }}
            className={cn(
              "inline-flex h-11 items-center gap-4 rounded-md border border-neutral-200 bg-white px-5",
              "font-display text-body-lg text-neutral-900 transition-colors hover:bg-neutral-100",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400",
            )}
          >
            {showAll
              ? "Show fewer modules"
              : `Show all ${pluralize(modules.length, "module")}`}
            <Icon
              name="chevron-down"
              size={20}
              className={cn("transition-transform", showAll && "rotate-180")}
            />
          </button>
        </div>
      ) : null}
    </section>
  );
}
