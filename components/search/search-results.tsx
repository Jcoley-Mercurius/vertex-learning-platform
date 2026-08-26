"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import posthog from "posthog-js";

import { SearchResultCard } from "./search-result-card";
import {
  Button,
  Icon,
  SearchInput,
  Select,
  buttonClassName,
  cn,
} from "@/components/ui";
import { pluralize } from "@/lib/format";
import { MAX_QUERY_LENGTH } from "@/lib/search/types";
import type { SearchResponse, SearchResult } from "@/lib/search/types";

/**
 * The search results page body from `design/vertex-search.png`: the heading block
 * with the count, the search field, the count and sort row, the ranked rows, and
 * the catalog band that closes the page.
 *
 * A client component because the results come from the server search route, which
 * is the only thing that may hold a token or talk to the MCP (AGENTS.md section 5).
 *
 * Sorting is local to the response — reordering the same matches never costs
 * another search.
 */

const sorts = {
  relevance: "Most Relevant",
  shortest: "Shortest first",
  longest: "Longest first",
  title: "Lesson title (A–Z)",
} as const;

type Sort = keyof typeof sorts;

type State =
  | { status: "idle" | "loading" | "error" }
  | { status: "done"; data: SearchResponse };

/** The correlation headers posthog-js gives us, when it has been initialised. */
function posthogHeaders(): Record<string, string> {
  try {
    const distinctId = posthog.get_distinct_id();
    if (!distinctId) return {};

    const sessionId = posthog.get_session_id();

    return {
      "X-POSTHOG-DISTINCT-ID": distinctId,
      ...(sessionId ? { "X-POSTHOG-SESSION-ID": sessionId } : {}),
    };
  } catch {
    return {};
  }
}

export function SearchResults({ query }: { query: string }) {
  const [state, setState] = useState<State>({
    status: query ? "loading" : "idle",
  });
  const [sort, setSort] = useState<Sort>("relevance");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    /* The page keys this component on the query, so a new search remounts it and
       the initial state already reflects whether there is anything to search. */
    if (!query) return;

    const controller = new AbortController();

    (async () => {
      try {
        const response = await fetch("/api/search", {
          method: "POST",
          /* `search_performed` is captured by the route, because that is where
             the search happens. These carry the browser's identity across so the
             server event lands on the same person and session replay. Omitted
             entirely when PostHog has no token and its ids are not real. */
          headers: {
            "Content-Type": "application/json",
            ...posthogHeaders(),
          },
          body: JSON.stringify({ query }),
          signal: controller.signal,
        });

        if (!response.ok) throw new Error(String(response.status));

        const data = (await response.json()) as SearchResponse;
        setState({ status: "done", data });
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error(error);
        setState({ status: "error" });
      }
    })();

    return () => controller.abort();
  }, [query, attempt]);

  const data = state.status === "done" ? state.data : null;

  const sorted = useMemo(
    () => (data ? sortResults(data.results, sort) : []),
    [data, sort],
  );

  return (
    <>
      <SearchHeader
        query={query}
        summary={
          state.status === "loading"
            ? "Searching every course…"
            : data && data.resultCount > 0
              ? `Found ${pluralize(data.resultCount, "result")} across ${pluralize(
                  data.courseCount,
                  "course",
                )}`
              : null
        }
      />

      {state.status === "loading" ? <Skeleton /> : null}

      {state.status === "error" ? (
        <div className="mt-12 text-center">
          <p className="text-body-lg text-neutral-700">
            Search is unavailable right now.
          </p>
          <Button
            variant="secondary"
            size="lg"
            className="mt-4"
            onClick={() => {
              setState({ status: "loading" });
              setAttempt((n) => n + 1);
            }}
          >
            Try again
          </Button>
        </div>
      ) : null}

      {state.status === "idle" ? (
        <p className="mt-12 text-center text-body-lg text-neutral-500">
          Type a question above to search across every course.
        </p>
      ) : null}

      {data && data.resultCount > 0 ? (
        <>
          <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
            <p role="status" className="text-body-lg font-medium text-neutral-900">
              {pluralize(data.resultCount, "result")}
            </p>

            <label className="flex items-center gap-3 text-body text-neutral-500">
              <span className="sr-only">Sort results</span>
              <Select
                className="w-[184px]"
                value={sort}
                onChange={(event) => {
                  const next = event.target.value as Sort;
                  posthog.capture("search_sorted", {
                    sort: next,
                    previous_sort: sort,
                    result_count: data.resultCount,
                    query,
                  });
                  setSort(next);
                }}
              >
                {Object.entries(sorts).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </label>
          </div>

          <ul className="mt-4 space-y-3">
            {sorted.map((result, index) => (
              <li key={`${result.kind}:${result.lessonId}`}>
                <SearchResultCard
                  result={result}
                  /* Rank as the learner sees it, so `search_result_opened`
                     reports the position under the current sort. */
                  position={index + 1}
                  resultCount={data.resultCount}
                  sort={sort}
                  query={query}
                />
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {data && data.resultCount === 0 ? (
        <p role="status" className="mt-12 text-center text-body-lg text-neutral-500">
          Nothing matched that search.
        </p>
      ) : null}

      {data ? <CatalogBand query={query} resultCount={data.resultCount} /> : null}
    </>
  );
}

/**
 * The heading block. It lives inside the client component because the count line
 * only exists once the results land.
 */
function SearchHeader({ query, summary }: { query: string; summary: string | null }) {
  return (
    <header className="text-center">
      <p className="inline-flex items-center rounded-xs bg-primary-100 px-3 py-1.5 text-small font-bold tracking-[0.12em] text-primary-500 uppercase">
        Search results
      </p>

      <h1 className="mt-6 font-display text-[2rem] leading-[1.15] font-bold text-neutral-900 sm:text-[2.75rem]">
        {query ? (
          <>
            Results for{" "}
            <span className="text-primary-500">&ldquo;{query}&rdquo;</span>
          </>
        ) : (
          "Search"
        )}
      </h1>

      {/* Reserved so the field below does not jump when the count arrives. */}
      <p className="mt-4 min-h-6 text-body-lg text-neutral-500">{summary}</p>

      <form
        action="/search"
        role="search"
        className="mx-auto mt-6 max-w-[730px]"
        onSubmit={(event) => {
          const next =
            (event.currentTarget.elements.namedItem("q") as HTMLInputElement)
              ?.value ?? "";
          posthog.capture("search_submitted", {
            query: next.trim().slice(0, 200),
            query_length: next.trim().length,
            source: "results_page",
          });
        }}
      >
        <label htmlFor="search-query" className="sr-only">
          Ask anything about your learning
        </label>
        <SearchInput
          id="search-query"
          name="q"
          defaultValue={query}
          maxLength={MAX_QUERY_LENGTH}
          placeholder="Ask anything about your learning..."
          className="[&_input]:h-14 [&_input]:shadow-sm"
        />
      </form>
    </header>
  );
}

/** The band that closes the page, and the pointer out when nothing matched. */
function CatalogBand({
  query,
  resultCount,
}: {
  query: string;
  resultCount: number;
}) {
  return (
    <div
      className={cn(
        "mt-4 flex flex-wrap items-center gap-x-6 gap-y-5 rounded-lg border border-neutral-200",
        "bg-primary-100/60 px-6 py-5",
      )}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-200 text-primary-500">
        <Icon name="search" size={20} />
      </span>

      <div className="min-w-0">
        <p className="text-body-lg font-semibold text-neutral-900">
          Can&rsquo;t find what you&rsquo;re looking for?
        </p>
        <p className="mt-1 text-body text-neutral-500">
          Try different keywords or browse our full course catalog.
        </p>
      </div>

      <Link
        href="/courses"
        className={buttonClassName({
          variant: "secondary",
          size: "cta",
          className: "ml-auto",
        })}
        onClick={() =>
          posthog.capture("catalog_opened_from_search", {
            query,
            result_count: resultCount,
            /* The interesting case: the search that sent them to the catalog
               because nothing on the page was good enough. */
            had_results: resultCount > 0,
          })
        }
      >
        Browse all courses
        <Icon name="arrow-right" size={20} />
      </Link>
    </div>
  );
}

/** Placeholder rows at the real row height, so the layout does not jump. */
function Skeleton() {
  return (
    <div aria-hidden className="mt-14 space-y-3">
      {[0, 1, 2].map((row) => (
        <div
          key={row}
          className="h-[182px] animate-pulse rounded-lg border border-neutral-200 bg-white"
        />
      ))}
    </div>
  );
}

/** "Most Relevant" is the agent's own order, so it is the array as it arrived. */
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
