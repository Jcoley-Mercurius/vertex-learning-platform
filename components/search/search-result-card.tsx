"use client";

import Image from "next/image";
import Link from "next/link";
import posthog from "posthog-js";

import { CourseGlyph } from "@/components/site/course-glyph";
import { Badge, Icon, cn } from "@/components/ui";
import { formatTimestamp } from "@/lib/video";
import type { SearchResult } from "@/lib/search/types";

/**
 * One row of the search results page, from `design/vertex-search.png`: a media
 * panel on the left and the match on the right, with the course above the title
 * and the action pinned to the bottom right.
 *
 * Every fact rendered here comes from Sanity by way of the search route
 * (AGENTS.md section 11) — the only model-authored text is `description`.
 *
 * The whole row is one link. The title carries the stretched anchor so the row
 * is a single tab stop, and the action beside it is decorative rather than a
 * second target.
 *
 * A client component so the one anchor can capture `search_result_opened`, which
 * is what closes the funnel from a search onto a lesson.
 */

const mediaPanel =
  "relative w-full shrink-0 overflow-hidden rounded-md sm:w-[276px] " +
  "aspect-[276/150] sm:aspect-auto sm:h-[150px]";

export function SearchResultCard({
  result,
  position,
  resultCount,
  sort,
  query,
}: {
  result: SearchResult;
  /** 1-based rank under the sort the learner is currently looking at. */
  position: number;
  resultCount: number;
  sort: string;
  query: string;
}) {
  const isVideo = result.kind === "video";

  const href = isVideo
    ? `/lessons/${encodeURIComponent(result.lessonSlug)}?t=${result.startSeconds}`
    : `/lessons/${encodeURIComponent(result.lessonSlug)}`;

  return (
    <article
      className={cn(
        "relative flex flex-col gap-5 rounded-lg border border-neutral-200 bg-white p-4",
        "shadow-sm transition-shadow hover:shadow-md sm:flex-row",
      )}
    >
      {isVideo ? (
        <VideoPanel result={result} />
      ) : (
        <KeyPointsPanel points={result.keyPoints} />
      )}

      <div className="flex min-w-0 flex-1 flex-col py-1 pr-1">
        <div className="flex items-start gap-4">
          <div className="flex min-w-0 items-center gap-3">
            {result.courseGlyph ? (
              <span className="h-6 w-6 shrink-0">
                <CourseGlyph name={result.courseGlyph} />
              </span>
            ) : null}
            <span className="truncate text-body text-neutral-500">
              {result.courseTitle}
            </span>
          </div>

          <Badge tone={isVideo ? "video" : "lesson"} className="ml-auto shrink-0">
            {isVideo ? "Video" : "Lesson"}
          </Badge>
        </div>

        <h3 className="mt-3 font-display text-heading-2 font-semibold text-neutral-900">
          <Link
            href={href}
            onClick={() =>
              posthog.capture("search_result_opened", {
                result_type: result.kind,
                result_position: position,
                result_count: resultCount,
                sort,
                query,
                lesson_id: result.lessonId,
                lesson_title: result.lessonTitle,
                lesson_number: result.lessonNumber ?? null,
                module_number: result.moduleNumber ?? null,
                course_title: result.courseTitle,
                course_slug: result.courseSlug,
                duration_seconds: result.durationSeconds,
                start_seconds: isVideo ? result.startSeconds : null,
              })
            }
            className={cn(
              "after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none",
              "focus-visible:after:outline-2 focus-visible:after:outline-offset-2",
              "focus-visible:after:outline-primary-400",
            )}
          >
            {result.lessonTitle}
          </Link>
        </h3>

        <p className="mt-2 max-w-[46ch] text-body text-neutral-500">
          {result.description}
        </p>

        <div className="mt-auto flex flex-wrap items-end justify-between gap-x-6 gap-y-3 pt-4">
          <Meta result={result} />

          <span className="inline-flex items-center gap-2 text-body font-medium text-primary-500">
            {isVideo ? (
              <>
                <Icon name="play-circle" variant="filled" size={18} />
                Watch from {formatTimestamp(result.startSeconds)}
              </>
            ) : (
              <>
                View lesson
                <Icon name="external-link" size={16} />
              </>
            )}
            <Icon name="chevron-right" size={16} />
          </span>
        </div>
      </div>
    </article>
  );
}

/** `Lesson 5.1 · Data Fetching & Caching` on a video row, `Module 5` on a lesson row. */
function Meta({ result }: { result: SearchResult }) {
  if (result.kind === "lesson") {
    return (
      <span className="text-body text-neutral-500">
        {result.moduleNumber ?? result.courseTitle}
      </span>
    );
  }

  const items = [
    result.lessonNumber
      ? { icon: "file" as const, label: result.lessonNumber }
      : null,
    result.moduleTitle
      ? { icon: "folder" as const, label: result.moduleTitle }
      : null,
  ].filter((item) => item !== null);

  if (items.length === 0) {
    return <span className="text-body text-neutral-500">{result.courseTitle}</span>;
  }

  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-2 text-body text-neutral-500">
      {items.map((item, index) => (
        <span key={item.label} className="inline-flex items-center gap-2">
          {index > 0 ? <span aria-hidden>&middot;</span> : null}
          <Icon name={item.icon} size={16} />
          {item.label}
        </span>
      ))}
    </span>
  );
}

/**
 * The video thumbnail: the lesson poster, a play affordance and the clip length
 * as `mm:ss`, the way the reference stamps it into the bottom right.
 */
function VideoPanel({
  result,
}: {
  result: Extract<SearchResult, { kind: "video" }>;
}) {
  return (
    <div className={cn(mediaPanel, "bg-neutral-900")}>
      {result.posterUrl ? (
        <Image
          src={result.posterUrl}
          alt={result.posterAlt}
          fill
          sizes="(min-width: 640px) 276px, 100vw"
          className="object-cover"
        />
      ) : null}

      <span
        aria-hidden
        className={cn(
          "absolute top-1/2 left-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2",
          "items-center justify-center rounded-full bg-white/90 text-neutral-900 shadow-md",
        )}
      >
        <Icon name="play-circle" variant="filled" size={28} />
      </span>

      {result.durationSeconds > 0 ? (
        <span className="absolute right-3 bottom-3 rounded-xs bg-neutral-900/85 px-2 py-1 text-small font-medium text-white">
          {formatTimestamp(result.durationSeconds)}
        </span>
      ) : null}
    </div>
  );
}

/** The lesson row's panel: the lesson's own key points, as the reference lists them. */
function KeyPointsPanel({ points }: { points: string[] }) {
  return (
    <div
      className={cn(
        mediaPanel,
        "flex items-center gap-3 border border-neutral-100 bg-neutral-50 px-4 py-3",
      )}
    >
      <Icon name="file-text" size={20} className="shrink-0 text-neutral-500" />

      {points.length > 0 ? (
        <ul className="min-w-0 space-y-2 text-body text-neutral-700">
          {points.slice(0, 3).map((point) => (
            <li key={point} className="flex gap-2">
              <span aria-hidden className="text-neutral-500">
                &bull;
              </span>
              <span className="truncate">{point}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-body text-neutral-500">Lesson notes</p>
      )}
    </div>
  );
}
