import { BookmarkButton } from "./bookmark-button";
import { Badge, Icon } from "@/components/ui";
import { formatCount, formatDuration, formatLevel } from "@/lib/format";

/**
 * The head of the lesson column from `design/vertex-lesson.png`: the positional
 * lesson label, the title, the summary and the meta row, with the bookmark
 * toggle pinned to the right.
 *
 * Every number is derived or stored — the label comes from array position
 * (AGENTS.md section 7), never from a field.
 */
export function LessonHero({
  lessonId,
  courseTitle,
  label,
  title,
  summary,
  durationSeconds,
  level,
  studentCount,
  freePreview,
}: {
  lessonId: string;
  courseTitle: string;
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

        {/* The one interactive element in this header, and the only client
            component on it: everything else here is server-rendered. */}
        <BookmarkButton lessonId={lessonId} lessonTitle={title} courseTitle={courseTitle} />
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
