import Link from "next/link";

import { Icon, buttonClassName } from "@/components/ui";
import { formatDuration } from "@/lib/format";

export type AdjacentLesson = {
  title: string;
  href: string;
  durationSeconds: number;
};

/**
 * The bar that closes the lesson column: the previous lesson on the left, the
 * next lesson on the right, both in curriculum order across module boundaries.
 * Either side is simply absent at the ends of the course.
 */
export function LessonNav({
  previous,
  next,
}: {
  previous: AdjacentLesson | null;
  next: AdjacentLesson | null;
}) {
  if (!previous && !next) return null;

  return (
    <nav
      aria-label="Lesson navigation"
      className="mt-12 flex flex-col gap-6 border-t border-neutral-200 py-8 sm:flex-row sm:items-center sm:gap-8"
    >
      {previous ? (
        <div className="flex items-center gap-6">
          <Link
            href={previous.href}
            className={buttonClassName({ variant: "tertiary", size: "cta", className: "whitespace-nowrap" })}
          >
            <Icon name="arrow-right" size={20} className="rotate-180" />
            Previous Lesson
          </Link>
          <span className="min-w-0">
            <span className="block truncate text-body text-neutral-500">{previous.title}</span>
            <span className="mt-1 block text-body text-neutral-500">
              {formatDuration(previous.durationSeconds)}
            </span>
          </span>
        </div>
      ) : null}

      {next ? (
        <div className="flex items-center gap-6 sm:ml-auto">
          <span className="min-w-0 sm:text-right">
            <span className="block truncate text-body text-neutral-500">{next.title}</span>
            <span className="mt-1 block text-body text-neutral-500">
              {formatDuration(next.durationSeconds)}
            </span>
          </span>
          <Link href={next.href} className={buttonClassName({ size: "cta", className: "whitespace-nowrap" })}>
            Next Lesson
            <Icon name="arrow-right" size={20} />
          </Link>
        </div>
      ) : null}
    </nav>
  );
}
