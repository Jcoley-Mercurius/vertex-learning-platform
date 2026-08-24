"use client";

import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { SearchInput } from "@/components/ui";

/**
 * The home page search form as a client component so that the submit event
 * can be tracked in PostHog. Navigates to /search?q=<query> on submit.
 */
export function SearchForm() {
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const query = (form.elements.namedItem("q") as HTMLInputElement)?.value ?? "";

    posthog.capture("search_submitted", {
      query_length: query.length,
    });

    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      className="mt-10 w-full max-w-[960px]"
    >
      <label htmlFor="site-search" className="sr-only">
        Ask anything about your learning
      </label>
      <SearchInput
        id="site-search"
        name="q"
        size="hero"
        placeholder="Ask anything about your learning..."
        className="shadow-sm"
      />
    </form>
  );
}
