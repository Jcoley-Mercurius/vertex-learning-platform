import { Badge, Icon, cn } from "@/components/ui";
import { formatCount, formatDuration, formatLevel } from "@/lib/format";

/**
 * The head of the lesson column from `design/vertex-lesson.png`: the positional
 * lesson label, the title, the summary and the meta row, with the bookmark
 * square pinned to the right.
 *
 * Every number is derived or stored — the label comes from array position
 * (AGENTS.md section 7), never from a field.
 */
export function LessonHero({
  label,
  title,
  summary,
  durationSeconds,
  level,
  studentCount,
  freePreview,
}: {
  label: string;
  title: string;
  summary: string | null;
  durationSeconds: number;
  level: string | null;
  studentCount: number | null;
  freePreview: boolean;
}) {
  const meta = [
    { icon: "clock" as const, filled: false, label: formatDuration(durationSeconds) },
    level ? { icon: "bar-chart" as const, filled: true, label: formatLevel(level) } : null,
    studentCount
      ? {
          icon: "users" as const,
          filled: false,
          label: `${formatCount(studentCount)} students`,
        }
      : null,
  ].filter((item) => item !== null);

  return (
    <header className="mt-8">
      <div className="flex items-start gap-6">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone="video">{label}</Badge>
            {freePreview ? <Badge tone="lesson">Free preview</Badge> : null}
          </div>

          <h1 className="mt-5 font-display text-[2rem] leading-[1.15] font-bold text-neutral-900 sm:text-[2.5rem]">
            {title}
          </h1>

          {summary ? (
            <p className="mt-5 max-w-[32rem] text-body-lg leading-[1.9] text-neutral-700">
              {summary}
            </p>
          ) : null}
        </div>

        {/* Presentational, like the notifications bell: bookmarks have no backend. */}
        <button
          type="button"
          aria-label="Bookmark this lesson"
          className={cn(
            "mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-neutral-200 bg-white",
            "text-primary-500 transition-colors hover:bg-primary-100",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400",
          )}
        >
          <Icon name="bookmark" size={20} />
        </button>
      </div>

      <ul className="mt-7 flex flex-wrap items-center gap-x-7 gap-y-3 text-body text-neutral-500">
        {meta.map((item) => (
          <li key={item.label} className="inline-flex items-center gap-2">
            <Icon
              name={item.icon}
              variant={item.filled ? "filled" : "outline"}
              size={18}
              className="text-primary-500"
            />
            {item.label}
          </li>
        ))}
      </ul>
    </header>
  );
}
