import { z } from "zod";

import type { CourseGlyphName } from "@/components/site/course-glyph";

/**
 * The contract between the search agent and the route.
 *
 * The agent is deliberately given almost nothing to write. It returns lesson ids
 * and an ordering; the route hydrates those ids from Sanity and builds every card
 * field from stored content. The only prose it authors is `description` and the
 * optional `reply`, so it cannot invent a course, a lesson, a duration or a count
 * (AGENTS.md sections 7 and 11).
 *
 * Optional fields are spelled `.nullable()`, never `.optional()`. OpenAI's
 * structured output is strict and rejects any schema whose `required` does not
 * list every property, so an optional field fails the request outright.
 */
export const searchOutputSchema = z.object({
  reply: z
    .string()
    .max(400)
    .nullable()
    .describe(
      "One or two sentences of markdown framing the results, or null when the results speak for themselves.",
    ),
  results: z
    .array(
      z.discriminatedUnion("kind", [
        z.object({
          kind: z.literal("lesson").describe("The lesson matches on its own topic."),
          lessonId: z
            .string()
            .describe("The _id of a lesson document, exactly as the dataset spells it."),
          startSeconds: z
            .null()
            .describe("Always null for lesson results — lesson matches have no timestamp."),
          description: z
            .string()
            .max(200)
            .describe("One sentence on why this matches the query. No invented facts."),
        }),
        z.object({
          kind: z
            .literal("video")
            .describe("A specific moment inside the lesson's video matches."),
          lessonId: z
            .string()
            .describe("The _id of a lesson document, exactly as the dataset spells it."),
          startSeconds: z
            .number()
            .int()
            .min(0)
            .describe("The second the match starts at, must be a non-negative integer."),
          description: z
            .string()
            .max(200)
            .describe("One sentence on why this matches the query. No invented facts."),
        }),
      ]),
    )
    .describe("Every relevant match, best first. Do not truncate to a handful."),
});

export type SearchOutput = z.infer<typeof searchOutputSchema>;

/** What a card needs, all of it read out of Sanity. */
type SearchResultBase = {
  lessonId: string;
  /** The agent's one-line reason. The only model-authored text on a card. */
  description: string;
  lessonTitle: string;
  lessonSlug: string;
  /** "Lesson 5.1" — positional, derived from the curriculum, never stored. */
  lessonNumber: string | null;
  /** "Module 5" — the same position, as the lesson rows label it. */
  moduleNumber: string | null;
  /** The owning module's own title, e.g. "Data Fetching & Caching". */
  moduleTitle: string | null;
  courseTitle: string;
  courseSlug: string;
  courseGlyph: CourseGlyphName | null;
  durationSeconds: number;
};

export type LessonSearchResult = SearchResultBase & {
  kind: "lesson";
  keyPoints: string[];
};

export type VideoSearchResult = SearchResultBase & {
  kind: "video";
  /** The second the match starts at, clamped to the lesson's runtime. */
  startSeconds: number;
  posterUrl: string | null;
  posterAlt: string;
};

export type SearchResult = LessonSearchResult | VideoSearchResult;

export type SearchResponse = {
  results: SearchResult[];
  resultCount: number;
  courseCount: number;
  reply: string | null;
};

/** The longest query the route will accept, in characters. */
export const MAX_QUERY_LENGTH = 300;
