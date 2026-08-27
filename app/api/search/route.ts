import { NextResponse } from "next/server";
import { NoOutputGeneratedError, Output, generateText, stepCountIs } from "ai";
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
import { resolveMoments, type MomentStats } from "@/lib/search/timestamps";
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

/**
 * Enough turns for a broad query plus a follow-up, without unbounded cost. The
 * model spends most turns writing and refining GROQ against the Sanity MCP, so a
 * tight cap can end the loop before it emits the final ranked object.
 */
const MAX_STEPS = 12;

/**
 * The last turn is reserved for the answer.
 *
 * `stopWhen` stops the loop, it does not ask the model to wrap up. A model still
 * calling tools on its final allowed step is cut off with no structured output at
 * all, and `output` then throws `AI_NoOutputGeneratedError` — a 502 on a search
 * that had already found its lessons. Taking the tools away on the last step
 * turns that into an answer built from whatever it has.
 */
function reserveLastStepForOutput({ stepNumber }: { stepNumber: number }) {
  return stepNumber >= MAX_STEPS - 1 ? { toolChoice: "none" as const } : {};
}

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

    const result = await generateText({
      model: openai(MODEL),
      system: buildSystemPrompt(initialContext),
      prompt: query,
      tools,
      stopWhen: stepCountIs(MAX_STEPS),
      prepareStep: reserveLastStepForOutput,
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

    // The tool loop can reach the step cap before the model emits its
    // `search_results` object. Only a clean "stop" finish carries that object;
    // reading `result.output` after any other finish throws
    // AI_NoOutputGeneratedError. A capped run degrades to an empty result set
    // plus the agent's last reply, never a 502.
    if (result.finishReason !== "stop") {
      await captureServerEvent(identity, "search_failed", {
        query_length: query.length,
        reason: "no_output",
        duration_ms: Date.now() - startedAt,
      });

      return NextResponse.json({
        results: [],
        resultCount: 0,
        courseCount: 0,
        reply: result.text || null,
      } satisfies SearchResponse);
    }

    const { response, momentStats } = await buildResponse(result.output, query);

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
      /* How the timestamps on those video cards were arrived at. A high
         `moments_dropped` means the model is proposing seconds the dataset does
         not contain, which is exactly what the resolver exists to catch. */
      moments_verified: momentStats.verified,
      moments_by_chapter: momentStats.resolvedByChapter,
      moments_by_transcript: momentStats.resolvedByTranscript,
      moments_promoted: momentStats.promoted,
      moments_dropped: momentStats.dropped,
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
  // The agent finished its tool loop without emitting the structured output. This
  // is its own bucket, kept apart from the provider errors that "model" holds.
  if (NoOutputGeneratedError.isInstance(error)) return "no_output";

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
 *
 * Timestamps get the same treatment. Whatever the agent proposed, the moment on a
 * video card is resolved against the lesson's own video document — chapters
 * first, transcript second (`lib/search/timestamps.ts`) — and a lesson with no
 * resolvable moment is a lesson card, not a card with a guessed second on it.
 */
async function buildResponse(
  output: Awaited<ReturnType<typeof searchOutputSchema.parseAsync>>,
  query: string,
): Promise<{ response: SearchResponse; momentStats: MomentStats }> {
  const ranked = dedupe(output.results);

  if (ranked.length === 0) {
    return {
      response: { results: [], resultCount: 0, courseCount: 0, reply: output.reply ?? null },
      momentStats: EMPTY_MOMENT_STATS,
    };
  }

  const lessons = await client.fetch(SEARCH_LESSONS_BY_IDS_QUERY, {
    ids: ranked.map((result) => result.lessonId),
  });

  const byId = new Map(lessons.map((lesson) => [lesson._id, lesson]));

  /* Rank order, narrowed to what actually exists. A lesson with no owning course
     cannot be labelled or linked, so it is not a result. Neither is a lesson the
     agent named that does not exist. */
  const hydrated = ranked.flatMap((ranking) => {
    const lesson = byId.get(ranking.lessonId);
    const course = lesson?.course;

    if (!lesson?.slug || !course?.slug) return [];

    /* The narrowed slugs travel with the row: the checks above do not survive
       into the loop below, and a cast there would only hide that. */
    return [{ ranking, lesson, course, lessonSlug: lesson.slug, courseSlug: course.slug }];
  });

  const { moments, stats } = await resolveMoments(
    query,
    hydrated.map(({ ranking }) => ({
      lessonId: ranking.lessonId,
      proposedStartSeconds: ranking.kind === "video" ? ranking.startSeconds : null,
    })),
  );

  const results: SearchResult[] = [];
  const courseIds = new Set<string>();

  for (const { ranking, lesson, course, lessonSlug, courseSlug } of hydrated) {
    const durationSeconds = lesson.durationSeconds ?? 0;
    const base = {
      lessonId: lesson._id,
      description: ranking.description,
      lessonTitle: lesson.title ?? "Untitled lesson",
      lessonSlug,
      ...curriculumPosition(course.modules, lesson._id),
      courseTitle: course.title ?? "Untitled course",
      courseSlug,
      courseGlyph: course.glyph ?? null,
      durationSeconds,
    };

    const moment = moments.get(lesson._id);

    if (moment) {
      // Reject moments whose stored startSeconds is outside the lesson runtime.
      if (durationSeconds && moment.startSeconds >= durationSeconds) {
        results.push({
          ...base,
          kind: "lesson",
          keyPoints: (lesson.keyPoints ?? []).filter((point): point is string => !!point),
        });
      } else {
        // Preserve the original moment.startSeconds and cap the clip end at runtime.
        const clipEnd = durationSeconds
          ? Math.min(moment.startSeconds + (moment.clipSeconds || 0), durationSeconds)
          : moment.startSeconds + (moment.clipSeconds || 0);
        const clipSeconds = clipEnd > moment.startSeconds ? clipEnd - moment.startSeconds : 0;

        results.push({
          ...base,
          kind: "video",
          startSeconds: moment.startSeconds,
          clipSeconds,
          chapterLabel: moment.chapterLabel,
          matchSource: moment.source,
          posterUrl: lesson.poster?.asset?.url ?? null,
          posterAlt: lesson.poster?.alt ?? lesson.title ?? "",
        });
      }
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
    response: {
      results,
      resultCount: results.length,
      courseCount: courseIds.size,
      reply: output.reply ?? null,
    },
    momentStats: stats,
  };
}

/** No lessons survived, so nothing was resolved either. */
const EMPTY_MOMENT_STATS: MomentStats = {
  verified: 0,
  resolvedByChapter: 0,
  resolvedByTranscript: 0,
  promoted: 0,
  dropped: 0,
};

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
