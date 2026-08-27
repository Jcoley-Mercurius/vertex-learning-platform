import Link from "next/link";

import { CourseGlyph, type CourseGlyphName } from "@/components/site";
import { Card, Icon, ProgressBar, buttonClassName } from "@/components/ui";
import { formatDuration, pluralize } from "@/lib/format";

export type LearningCourse = {
  _id: string;
  title: string;
  href: string;
  summary: string;
  glyph: CourseGlyphName;
  percent: number;
  completedLessons: number;
  totalLessons: number;
  durationSeconds: number;
  /** Where the learner picks up. Null when the course has no linkable lesson. */
  resumeHref: string | null;
  resumeLabel: string;
  action: string;
};

/**
 * A course as My Learning shows it: the catalog card's glyph, title and summary,
 * with the learner's progress and a resume action in place of the meta row.
 *
 * Built from the shipped card, progress bar and button rather than a new
 * treatment — there is no design reference for this page, so it stays inside the
 * vocabulary the catalog and the course page already use (AGENTS.md section 3).
 */
export function LearningCourseCard({ course }: { course: LearningCourse }) {
  return (
    <Card as="article" className="flex h-full flex-col p-7">
      <div className="flex items-start gap-4">
        <span className="h-14 w-14 shrink-0 overflow-hidden rounded-md">
          <CourseGlyph name={course.glyph} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-heading-3 font-medium text-neutral-900">
            <Link
              href={course.href}
              className="rounded-xs transition-colors hover:text-primary-500 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-400"
            >
              {course.title}
            </Link>
          </h3>
          <p className="mt-1 line-clamp-2 text-body text-neutral-500">{course.summary}</p>
        </div>
      </div>

      <div className="mt-6">
        <p className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-body text-neutral-500">
          <span>
            <span className="font-semibold text-neutral-900">{course.percent}%</span> complete
          </span>
          <span>
            {course.completedLessons} of {pluralize(course.totalLessons, "lesson")} &middot;{" "}
            {formatDuration(course.durationSeconds)}
          </span>
        </p>
        <ProgressBar value={course.percent} showLabel={false} className="mt-2" />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
        {course.resumeHref ? (
          <Link href={course.resumeHref} className={buttonClassName({ size: "md" })}>
            {course.action}
            <Icon name="arrow-right" size={18} />
          </Link>
        ) : null}
        <p className="text-body text-neutral-500">{course.resumeLabel}</p>
      </div>
    </Card>
  );
}
