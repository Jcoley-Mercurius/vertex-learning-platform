import { NextResponse } from "next/server";
import { Output, generateText, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";
import { auth } from "@clerk/nextjs/server";

import {
  analyticsText,
  captureServerEvent,
  captureServerException,
  resolveIdentity,
} from "@/lib/analytics";
import { createSearchMcpClient, fetchInitialContext } from "@/lib/search/mcp";
import { buildSystemPrompt } from "@/lib/search/prompt";
import {
  MAX_QUERY_LENGTH,
  searchOutputSchema,
  type SearchResponse,
  type SearchResult,
} from "@/lib/search/types";
import { client } from "@/sanity/lib/client";
import { SEARCH_LESSONS_BY_IDS_QUERY } from "@/sanity/lib/queries";

/**
 * The search API (AGENTS.md section 5). It connects to the Sanity Context MCP,
 * injects the schema and the system prompt, calls the model, and returns ranked
 * result cards.
 *
 * The browser never touches the MCP, the model or a token — it only POSTs a query
 * here. The model only ever chooses lesson ids and an ordering; every fact on a
 * card is read back out of Sanity below.
 *
 * This is also where `search_performed` is captured. Search happens here, so the
 * server is the only place that knows the latency and the real result mix, and
 * the browser correlates itself onto the event with the PostHog headers it sends
 * (`lib/analytics.ts`).
 */

/** The MCP client and the Sanity client both need Node, not the edge runtime. */
export const runtime = "nodejs";

/** Enough turns for a broad query plus a follow-up, without unbounded cost. */
const MAX_STEPS = 8;

/** A search that has not landed by now is not worth making the learner wait for. */
const REQUEST_TIMEOUT_MS = 60_000;

/**
 * In-memory rate limiting: 10 searches per user per minute. Resets on server
 * restart, which is acceptable for a learning platform where billed search abuse
 * is the concern, not production-grade rate control.
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 10;

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  record.count += 1;
  return true;
}

/** Named once so both the call and the analytics property read the same value. */
const MODEL = "gpt-5";

export async function POST(request: Request) {
  const startedAt = Date.now();
  const identity = await resolveIdentity(request);

  // Require authentication before processing any search request.
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: "Authentication required. Please sign in to search." },
      { status: 401 },
    );
  }

  // Rate limit by authenticated user ID to prevent abuse of the billed search operation.
  if (!checkRateLimit(userId)) {
    return NextResponse.json(
      { error: "Too many search requests. Please try again in a minute." },
      { status: 429 },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const query =
    typeof body === "object" && body !== null && "query" in body
      ? String((body as { query: unknown }).query ?? "").trim()
      : "";

  if (!query) {
    return NextResponse.json({ error: "A search query is required." }, { status: 400 });
  }

  if (query.length > MAX_QUERY_LENGTH) {
    // Deliberately does not echo the query back.
    return NextResponse.json(
      { error: `A search query cannot be longer than ${MAX_QUERY_LENGTH} characters.` },
      { status: 400 },
    );
  }

  let mcpClient: Awaited<ReturnType<typeof createSearchMcpClient>> | undefined;

  try {
    const clientPromise = createSearchMcpClient();
    const contextPromise = fetchInitialContext();

    // Assign mcpClient as soon as it resolves, before awaiting context fetch,
    // so it remains reachable for cleanup even if context fetch fails.
    mcpClient = await clientPromise;
    const initialContext = await contextPromise;

    // The schema is already in the system prompt, so the tool that fetches it
    // would only burn a turn and duplicate the payload.
    const tools = Object.fromEntries(
      Object.entries(await mcpClient.tools()).filter(
        ([name]) => name !== "initial_context",
      ),
    );

    const { output } = await generateText({
      model: openai(MODEL),
      system: buildSystemPrompt(initialContext),
      prompt: query,
      tools,
      stopWhen: stepCountIs(MAX_STEPS),
      output: Output.object({
        schema: searchOutputSchema,
        name: "search_results",
        description: "The ranked lessons that answer the learner's query.",
      }),
      // Search is an interactive page, so latency is a feature. At the default
      // reasoning effort this query took minutes; at 'low' it takes ~20s with no
      // loss in result quality, because the ranking work is in the GROQ the model
      // writes rather than in extended deliberation.
      providerOptions: { openai: { reasoningEffort: "low", textVerbosity: "low" } },
      abortSignal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    const response = await buildResponse(output);

    await captureServerEvent(identity, "search_performed", {
      query: analyticsText(query),
      query_length: query.length,
      result_count: response.resultCount,
      course_count: response.courseCount,
      video_result_count: countKind(response, "video"),
      lesson_result_count: countKind(response, "lesson"),
      has_results: response.resultCount > 0,
      duration_ms: Date.now() - startedAt,
      model: MODEL,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("Search failed", error);

    // The query text is deliberately left off a failure: a search that never ran
    // says nothing about what learners look for, only that the route broke.
    await captureServerEvent(identity, "search_failed", {
      query_length: query.length,
      reason: failureReason(error),
      duration_ms: Date.now() - startedAt,
    });
    await captureServerException(identity, error);

    return NextResponse.json(
      { error: "Search is unavailable right now. Please try again." },
      { status: 502 },
    );
  } finally {
    await mcpClient?.close().catch(() => {});
  }
}

/** How many of the returned cards are of one kind. */
function countKind(response: SearchResponse, kind: SearchResult["kind"]) {
  return response.results.filter((result) => result.kind === kind).length;
}

/**
 * Which stage of the search broke, coarse enough to group on in PostHog and
 * never carrying the underlying message as a property.
 */
function failureReason(error: unknown) {
  if (error instanceof Error) {
    if (error.name === "TimeoutError" || error.name === "AbortError") return "timeout";
    if (/mcp|context/i.test(error.message)) return "mcp";
    if (/model|openai|schema|output/i.test(error.message)) return "model";
  }

  return "unknown";
}

/**
 * Turns the agent's ranked ids into cards. Anything the agent named that does not
 * resolve to a real lesson in a real course drops out here — that is the backstop
 * that keeps an invented result off the page.
 */
async function buildResponse(
  output: Awaited<ReturnType<typeof searchOutputSchema.parseAsync>>,
): Promise<SearchResponse> {
  const ranked = dedupe(output.results);

  if (ranked.length === 0) {
    return { results: [], resultCount: 0, courseCount: 0, reply: output.reply ?? null };
  }

  const lessons = await client.fetch(SEARCH_LESSONS_BY_IDS_QUERY, {
    ids: ranked.map((result) => result.lessonId),
  });

  const byId = new Map(lessons.map((lesson) => [lesson._id, lesson]));
  const results: SearchResult[] = [];
  const courseIds = new Set<string>();

  for (const ranking of ranked) {
    const lesson = byId.get(ranking.lessonId);
    const course = lesson?.course;

    // A lesson with no owning course cannot be labelled or linked, so it is not
    // a result. Neither is a lesson the agent named that does not exist.
    if (!lesson?.slug || !course?.slug) continue;

    const durationSeconds = lesson.durationSeconds ?? 0;
    const base = {
      lessonId: lesson._id,
      description: ranking.description,
      lessonTitle: lesson.title ?? "Untitled lesson",
      lessonSlug: lesson.slug,
      ...curriculumPosition(course.modules, lesson._id),
      courseTitle: course.title ?? "Untitled course",
      courseSlug: course.slug,
      courseGlyph: course.glyph ?? null,
      durationSeconds,
    };

    if (ranking.kind === "video" && ranking.startSeconds !== null) {
      results.push({
        ...base,
        kind: "video",
        // Clamped: a timestamp past the runtime would seek nowhere.
        startSeconds: durationSeconds
          ? Math.min(ranking.startSeconds, durationSeconds)
          : ranking.startSeconds,
        posterUrl: lesson.poster?.asset?.url ?? null,
        posterAlt: lesson.poster?.alt ?? lesson.title ?? "",
      });
    } else {
      results.push({
        ...base,
        kind: "lesson",
        keyPoints: (lesson.keyPoints ?? []).filter((point): point is string => !!point),
      });
    }

    courseIds.add(course._id);
  }

  return {
    results,
    resultCount: results.length,
    courseCount: courseIds.size,
    reply: output.reply ?? null,
  };
}

/** The agent can name the same lesson twice across queries. First rank wins. */
function dedupe(results: SearchResponseInput) {
  const seen = new Set<string>();

  return results.filter((result) => {
    if (seen.has(result.lessonId)) return false;
    seen.add(result.lessonId);
    return true;
  });
}

type SearchResponseInput = Awaited<
  ReturnType<typeof searchOutputSchema.parseAsync>
>["results"];

/**
 * Where the lesson sits in its course: "Lesson 5.1", "Module 5", and the module's
 * own title. Module and lesson numbers are positional and never stored
 * (AGENTS.md section 8), so they are counted off the curriculum here. A lesson
 * missing from its course's modules gets nulls rather than a made-up position.
 */
function curriculumPosition(
  modules: { title: string | null; lessonIds: string[] | null }[] | null,
  lessonId: string,
) {
  for (const [moduleIndex, module] of (modules ?? []).entries()) {
    const lessonIndex = (module.lessonIds ?? []).indexOf(lessonId);

    if (lessonIndex !== -1) {
      return {
        lessonNumber: `Lesson ${moduleIndex + 1}.${lessonIndex + 1}`,
        moduleNumber: `Module ${moduleIndex + 1}`,
        moduleTitle: module.title ?? null,
      };
    }
  }

  return { lessonNumber: null, moduleNumber: null, moduleTitle: null };
}
