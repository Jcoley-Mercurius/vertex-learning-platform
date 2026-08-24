import type { Metadata } from "next";

import { SearchResults } from "@/components/search";
import { SiteHeader } from "@/components/site";
import { SearchInput } from "@/components/ui";
import { MAX_QUERY_LENGTH } from "@/lib/search/types";

export const metadata: Metadata = {
  title: "Search — Vertex",
  description: "Search every Vertex course in plain English.",
};

/**
 * The search results page (AGENTS.md section 11): a full page of ranked results,
 * not a widget and not a chatbox. The page is a shell — the results themselves
 * come from `/api/search`, which is the only place the MCP and the model are
 * reachable from.
 */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const { q } = await searchParams;
  const raw = Array.isArray(q) ? q[0] : q;
  const query = (raw ?? "").trim().slice(0, MAX_QUERY_LENGTH);

  return (
    <>
      <SiteHeader />

      <main className="flex-1">
        <div className="mx-auto w-full max-w-[936px] px-6 pt-10 pb-24">
          <h1 className="font-display text-[2.25rem] leading-[1.15] font-bold text-neutral-900">
            Search
          </h1>

          <form action="/search" role="search" className="mt-6">
            <label htmlFor="search-query" className="sr-only">
              Ask anything about your learning
            </label>
            <SearchInput
              id="search-query"
              name="q"
              defaultValue={query}
              maxLength={MAX_QUERY_LENGTH}
              placeholder="Ask anything about your learning..."
            />
          </form>

          {/* Keyed on the query so a new search resets the component's state. */}
          <SearchResults key={query} query={query} />
        </div>
      </main>
    </>
  );
}
