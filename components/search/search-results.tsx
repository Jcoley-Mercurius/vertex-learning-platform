"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import posthog from "posthog-js";
import ReactMarkdown from "react-markdown";

import { Button, LessonCard, LessonVideoCard, Select } from "@/components/ui";
import { formatDuration, pluralize } from "@/lib/format";
import { formatTimestamp } from "@/lib/video";
import type { SearchResponse, SearchResult } from "@/lib/search/types";

/**
 * The search results page body (AGENTS.md section 11). A client component because
 * the results come from the server search route, which is the only thing that may
 * hold a token or talk to the MCP.
 *
 * Sorting is local to the response — reordering the same matches never costs
 * another search.
 */

const sorts = {
  relevance: "Most relevant",
  shortest: "Shortest first",
  longest: "Longest first",
  title: "Lesson title (A–Z)",
} as const;

type Sort = keyof typeof sorts;

export function SearchResults({ query }: { query: string }) {
  const [state, setState] = useState<
    { status: "idle" | "loading" | "error" } | { status: "done"; data: SearchResponse }
  >({ status: query ? "loading" : "idle" });
  const [sort, setSort] = useState<Sort>("relevance");
  const [attempt, setAttempt] = useState(0);

  /* One capture per set of results, not one per re-render. */
  const captured = useRef<string | null>(null);

  useEffect(() => {
    /* The page keys this component on the query, so a new search remounts it and
       the initial state already reflects whether there is anything to search. */
    if (!query) return;

    const controller = new AbortController();

    (async () => {
      try {
        const response = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
          signal: controller.signal,
        });

        if (!response.ok) throw new Error(String(response.status));

        const data = (await response.json()) as SearchResponse;
        setState({ status: "done", data });

        const key = `${query}:${attempt}`;
        if (captured.current !== key) {
          captured.current = key;
          /* Counts only — the query text itself never leaves the page. */
          posthog.capture("search_performed", {
            query_length: query.length,
            result_count: data.resultCount,
            course_count: data.courseCount,
          });
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error(error);
        setState({ status: "error" });
      }
    })();

    return () => controller.abort();
  }, [query, attempt]);

  const sorted = useMemo(
    () => (state.status === "done" ? sortResults(state.data.results, sort) : []),
    [state, sort],
  );

  if (!query) {
    return (
      <Empty message="Type a question above to search across every course." />
    );
  }

  if (state.status === "loading") {
    return (
      <p role="status" className="mt-8 text-body-lg text-neutral-500">
        Searching every course…
      </p>
    );
  }

  if (state.status === "error") {
    return (
      <div className="mt-8">
        <p className="text-body-lg text-neutral-700">
          Search is unavailable right now.
        </p>
        <Button
          variant="secondary"
          size="md"
          className="mt-4"
          onClick={() => {
            setState({ status: "loading" });
            setAttempt((n) => n + 1);
          }}
        >
          Try again
        </Button>
      </div>
    );
  }

  if (state.status !== "done") return null;

  const { data } = state;

  if (data.resultCount === 0) {
    return (
      <Empty message="Nothing matched that search.">
        <Link
          href="/courses"
          className="mt-4 inline-flex text-body-lg font-medium text-primary-500 hover:text-[#ea580c]"
        >
          Browse all courses
        </Link>
      </Empty>
    );
  }

  return (
    <>
      {data.reply ? (
        <div className="mt-6 max-w-[70ch] text-body-lg text-neutral-700 [&_a]:text-primary-500 [&_p]:mt-2 [&_p:first-child]:mt-0">
          <ReactMarkdown>{data.reply}</ReactMarkdown>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <p role="status" className="text-body-lg text-neutral-500">
          Found {pluralize(data.resultCount, "result")} across{" "}
          {pluralize(data.courseCount, "course")}
        </p>

        <label className="flex items-center gap-3 text-body text-neutral-500">
          <span className="whitespace-nowrap">Sort by</span>
          <Select
            className="w-[200px]"
            value={sort}
            onChange={(event) => setSort(event.target.value as Sort)}
          >
            {Object.entries(sorts).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </label>
      </div>

      <ul className="mt-6 grid gap-6 lg:grid-cols-2">
        {sorted.map((result) => (
          <li key={`${result.kind}:${result.lessonId}`} className="flex">
            <ResultCard result={result} />
          </li>
        ))}
      </ul>
    </>
  );
}

function ResultCard({ result }: { result: SearchResult }) {
  if (result.kind === "video") {
    return (
      <Link
        href={`/lessons/${result.lessonSlug}?t=${result.startSeconds}`}
        className="flex w-full rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-400"
      >
        <LessonVideoCard
          className="w-full"
          title={result.lessonTitle}
          description={result.description}
          lessonLabel={result.lessonLabel}
          clipLength={formatDuration(result.durationSeconds)}
          watchFrom={formatTimestamp(result.startSeconds)}
        />
      </Link>
    );
  }

  return (
    <Link
      href={`/lessons/${result.lessonSlug}`}
      className="flex w-full rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-400"
    >
      <LessonCard
        className="w-full"
        title={result.lessonTitle}
        description={result.description}
        moduleLabel={result.lessonLabel}
      />
    </Link>
  );
}

function Empty({ message, children }: { message: string; children?: React.ReactNode }) {
  return (
    <div className="mt-8">
      <p className="text-body-lg text-neutral-700">{message}</p>
      {children}
    </div>
  );
}

/** "Most relevant" is the agent's own order, so it is the array as it arrived. */
function sortResults(results: SearchResult[], sort: Sort) {
  const sorted = [...results];

  switch (sort) {
    case "shortest":
      return sorted.sort((a, b) => a.durationSeconds - b.durationSeconds);
    case "longest":
      return sorted.sort((a, b) => b.durationSeconds - a.durationSeconds);
    case "title":
      return sorted.sort((a, b) => a.lessonTitle.localeCompare(b.lessonTitle));
    default:
      return sorted;
  }
}
