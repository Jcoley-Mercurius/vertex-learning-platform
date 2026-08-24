import Link from "next/link";
import { Icon, ProgressBar, buttonClassName } from "@/components/ui";

/**
 * The progress band that closes the course page. Progress tracking has no
 * backend yet (no progress document, no write route), so the page passes `null`
 * and this renders the zero state: 0% complete, and the action reads
 * "Start Learning". When progress lands, it is the same shape with real values.
 */
export function CourseProgress({
  progress,
  href,
  label,
}: {
  /** Percentage complete, or `null` when the learner has no progress recorded. */
  progress: number | null;
  href?: string;
  label: string;
}) {
  const value = progress ?? 0;

  return (
    <div className="flex flex-wrap items-center gap-x-10 gap-y-6 rounded-lg border border-neutral-200 bg-white px-7 py-5 shadow-sm">
      <div className="shrink-0">
        <p className="text-body text-neutral-500">Your Progress</p>
        <p className="mt-1 text-body-lg text-neutral-500">
          <span className="font-semibold text-neutral-900">{value}%</span> complete
        </p>
      </div>

      <ProgressBar value={value} showLabel={false} className="w-full max-w-[20rem]" />

      {href ? (
        <Link href={href} className={buttonClassName({ size: "cta", className: "ml-auto" })}>
          {label}
          <Icon name="arrow-right" size={20} />
        </Link>
      ) : null}
    </div>
  );
}
