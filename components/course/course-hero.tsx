import Link from "next/link";
import { CourseGlyph, type CourseGlyphName } from "@/components/site";
import { Badge, Icon, buttonClassName } from "@/components/ui";
import { formatCount, formatDuration, formatLevel, pluralize } from "@/lib/format";

/**
 * The course hero from `design/vertex-course.png`: the glyph tile beside the
 * title block. Every value comes from Sanity — the counts and the runtime are
 * derived from the curriculum, never stored (AGENTS.md section 7).
 */
export function CourseHero({
  title,
  summary,
  glyph,
  level,
  popular,
  moduleCount,
  durationSeconds,
  studentCount,
  primaryHref,
  primaryLabel,
}: {
  title: string;
  summary: string | null;
  glyph: CourseGlyphName | null;
  level: string | null;
  popular: boolean;
  moduleCount: number;
  durationSeconds: number;
  studentCount: number | null;
  /** The lesson the learner lands on, or `undefined` when the course has none. */
  primaryHref?: string;
  primaryLabel: string;
}) {
  const meta = [
    level ? { icon: "bar-chart" as const, filled: true, label: formatLevel(level) } : null,
    { icon: "clock" as const, filled: false, label: formatDuration(durationSeconds) },
    { icon: "file" as const, filled: false, label: pluralize(moduleCount, "module") },
    studentCount
      ? {
          icon: "users" as const,
          filled: false,
          label: `${formatCount(studentCount)} students`,
        }
      : null,
  ].filter((item) => item !== null);

  return (
    <section className="mt-10 grid gap-10 sm:grid-cols-[17.5rem_1fr] sm:gap-15">
      <div className="w-full max-w-[17.5rem] shrink-0">
        <div className="aspect-[280/326] w-full overflow-hidden rounded-lg">
          <CourseGlyph name={glyph ?? "nextjs"} />
        </div>
      </div>

      <div className="min-w-0">
        {popular ? <Badge tone="popular">Popular</Badge> : null}

        <h1
          className={`font-display text-[2.25rem] leading-[1.15] font-bold text-neutral-900 sm:text-[2.75rem] ${
            popular ? "mt-5" : ""
          }`}
        >
          {title}
        </h1>

        {summary ? (
          <p className="mt-6 max-w-[26rem] text-body-lg leading-[1.95] text-neutral-700">
            {summary}
          </p>
        ) : null}

        <ul className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3 text-body text-neutral-500">
          {meta.map((item) => (
            <li key={item.label} className="inline-flex items-center gap-2">
              <Icon
                name={item.icon}
                variant={item.filled ? "filled" : "outline"}
                size={18}
              />
              {item.label}
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          {primaryHref ? (
            <Link href={primaryHref} className={buttonClassName({ size: "cta" })}>
              {primaryLabel}
              <Icon name="arrow-right" size={20} />
            </Link>
          ) : null}

          {/* Presentational, like the notifications bell: bookmarks have no backend. */}
          <button
            type="button"
            className={buttonClassName({ variant: "tertiary", size: "cta" })}
          >
            <Icon name="bookmark" size={20} />
            Bookmark
          </button>
        </div>
      </div>
    </section>
  );
}
