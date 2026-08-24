import { z } from "zod";

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
      z.object({
        lessonId: z
          .string()
          .describe("The _id of a lesson document, exactly as the dataset spells it."),
        kind: z
          .enum(["lesson", "video"])
          .describe(
            "'lesson' when the lesson matches on its own topic. 'video' when a specific moment inside its video matches.",
          ),
        startSeconds: z
          .number()
          .int()
          .min(0)
          .nullable()
          .describe(
            "For kind 'video', the second the match starts at. Always null for kind 'lesson'.",
          ),
        description: z
          .string()
          .max(200)
          .describe("One sentence on why this matches the query. No invented facts."),
      }),
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
  /** "Lesson 5.1 in Data Fetching and Caching". */
  lessonLabel: string;
  courseTitle: string;
  courseSlug: string;
  courseGlyph: string | null;
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
