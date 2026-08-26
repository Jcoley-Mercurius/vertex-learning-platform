import "server-only";

import { client } from "@/sanity/lib/client";
import { SEARCH_VIDEO_MOMENTS_QUERY } from "@/sanity/lib/queries";

/**
 * Two-stage timestamp resolution (AGENTS.md section 7), run on the server rather
 * than left to the model.
 *
 * The agent ranks lessons and may propose the second a moment starts at, but a
 * proposed number is only ever a claim. Every timestamp that reaches a card is
 * resolved — or verified — against the lesson's own `video` document here:
 * chapters first, because their labels are clean authored text, and the
 * transcript chunks only when no chapter matches. A number that is in neither is
 * dropped, and the result degrades to a lesson result. That is the same backstop
 * the route already applies to lesson ids, applied to the one field that had
 * none.
 *
 * Server only: it reads the private dataset with the read token.
 */

/** How many keywords the moments query can OR together. */
export const MOMENT_TOKEN_SLOTS = 6;

/** Padding for an unused slot: a pattern no transcript will contain. */
const NO_MATCH_PATTERN = "zzzznomatchzzzz";

/** The longest a single keyword may be before it is truncated. */
const MAX_TOKEN_LENGTH = 24;

/**
 * Words that occur in nearly every transcript, so matching on them would return
 * an arbitrary moment rather than a relevant one.
 */
const STOP_WORDS = new Set([
  "and",
  "are",
  "but",
  "can",
  "does",
  "for",
  "from",
  "how",
  "into",
  "the",
  "this",
  "that",
  "them",
  "then",
  "they",
  "use",
  "using",
  "what",
  "when",
  "where",
  "which",
  "why",
  "with",
  "you",
  "your",
]);

/**
 * The learner's query as wildcarded keywords. Text matching is token based, so a
 * whole phrase matched as one pattern returns nothing (AGENTS.md section 11).
 *
 * Everything outside `[a-z0-9]` is dropped, so nothing from the query can change
 * the shape of the GROQ it lands in — the tokens travel as parameters, and the
 * query text itself is a constant.
 */
export function queryTokens(query: string) {
  const seen = new Set<string>();

  for (const raw of query.toLowerCase().split(/[^a-z0-9]+/)) {
    const token = raw.slice(0, MAX_TOKEN_LENGTH);

    if (token.length < 3 || STOP_WORDS.has(token)) continue;

    seen.add(token);
    if (seen.size === MOMENT_TOKEN_SLOTS) break;
  }

  return [...seen];
}

/** The `$t0`…`$t5` the moments query expects, padded out to a full set. */
function tokenParams(tokens: string[]) {
  return Object.fromEntries(
    Array.from({ length: MOMENT_TOKEN_SLOTS }, (_, index) => [
      `t${index}`,
      tokens[index] ? `${tokens[index]}*` : NO_MATCH_PATTERN,
    ]),
  ) as Record<`t${number}`, string>;
}

/** What the agent said about one lesson before anything was verified. */
export type MomentCandidate = {
  lessonId: string;
  /** The agent's proposed second, or `null` when it returned a lesson result. */
  proposedStartSeconds: number | null;
};

export type ResolvedMoment = {
  /** A second that exists in the video document. Never a model-authored number. */
  startSeconds: number;
  /** How long the matched moment runs for — the card's clip length. */
  clipSeconds: number;
  /** The chapter the moment falls inside, when the video has a table of contents. */
  chapterLabel: string | null;
  /** Which stage resolved it. */
  source: "chapter" | "transcript";
};

/** Coarse counts for `search_performed`, so the resolution mix is measurable. */
export type MomentStats = {
  /** The agent's own timestamp was found in the video and kept. */
  verified: number;
  resolvedByChapter: number;
  resolvedByTranscript: number;
  /** The agent returned a lesson result and a chapter match upgraded it. */
  promoted: number;
  /** The agent proposed a moment that could not be found, so the card is a lesson. */
  dropped: number;
};

export type MomentResolution = {
  moments: Map<string, ResolvedMoment>;
  stats: MomentStats;
};

const EMPTY_STATS: MomentStats = {
  verified: 0,
  resolvedByChapter: 0,
  resolvedByTranscript: 0,
  promoted: 0,
  dropped: 0,
};

/**
 * Resolves each candidate to a real moment, or to nothing.
 *
 * A lesson the agent returned as a plain lesson result is only ever promoted on a
 * chapter match. Transcripts are thousands of chunks of spoken filler, so nearly
 * any keyword occurs somewhere in them, and promoting off one would manufacture a
 * moment for a lesson the agent did not think matched at all.
 */
export async function resolveMoments(
  query: string,
  candidates: MomentCandidate[],
): Promise<MomentResolution> {
  const tokens = queryTokens(query);
  const moments = new Map<string, ResolvedMoment>();
  const stats = { ...EMPTY_STATS };

  if (candidates.length === 0 || tokens.length === 0) {
    // Every proposed moment is unverifiable without keywords to resolve it by.
    stats.dropped = candidates.filter(
      (candidate) => candidate.proposedStartSeconds !== null,
    ).length;

    return { moments, stats };
  }

  const rows = await client.fetch(SEARCH_VIDEO_MOMENTS_QUERY, {
    ids: candidates.map((candidate) => candidate.lessonId),
    ...tokenParams(tokens),
  });

  const byId = new Map(rows.map((row) => [row._id, row]));

  for (const candidate of candidates) {
    const row = byId.get(candidate.lessonId);
    const video = row?.video;
    const proposed = candidate.proposedStartSeconds;

    if (!video) {
      if (proposed !== null) stats.dropped += 1;
      continue;
    }

    const chapters = (video.chapters ?? [])
      .map((chapter) => ({
        startSeconds: chapter.startSeconds ?? 0,
        label: chapter.label ?? null,
      }))
      .sort((a, b) => a.startSeconds - b.startSeconds);

    const chunks = (video.matchedChunks ?? []).map((chunk) => ({
      startSeconds: chunk.startSeconds ?? 0,
      text: chunk.text ?? "",
    }));

    /* The runtime the clip length is measured against. The lesson's own duration
       is the one the UI trusts (the source's may differ), with the video's as the
       fallback when the lesson has none. */
    const runtime = row?.durationSeconds || video.runtimeSeconds || 0;

    const bestChapter = bestMatch(
      chapters.filter((chapter) => chapter.label !== null),
      tokens,
      (chapter) => chapter.label ?? "",
    );
    const bestChunk = bestMatch(chunks, tokens, (chunk) => chunk.text);

    /* Stage 0: the agent's own number, kept only if the dataset actually contains
       it — as a chapter boundary, or as the start of a chunk that matched this
       query. A chunk that did not match is not a moment for this search. */
    const verifiedChapter =
      proposed !== null
        ? chapters.find((chapter) => chapter.startSeconds === proposed)
        : undefined;
    const verifiedChunk =
      proposed !== null && !verifiedChapter
        ? chunks.find((chunk) => chunk.startSeconds === proposed)
        : undefined;

    const verified = verifiedChapter ?? verifiedChunk;

    if (verified) {
      stats.verified += 1;
      moments.set(
        candidate.lessonId,
        buildMoment(
          verified.startSeconds,
          verifiedChapter ? "chapter" : "transcript",
          chapters,
          runtime,
        ),
      );
      continue;
    }

    // Stage 1: the chapters, whose labels are clean.
    if (bestChapter) {
      if (proposed === null) stats.promoted += 1;
      stats.resolvedByChapter += 1;
      moments.set(
        candidate.lessonId,
        buildMoment(bestChapter.startSeconds, "chapter", chapters, runtime),
      );
      continue;
    }

    // Stage 2: the transcript, and only for a lesson the agent already timed.
    if (bestChunk && proposed !== null) {
      stats.resolvedByTranscript += 1;
      moments.set(
        candidate.lessonId,
        buildMoment(bestChunk.startSeconds, "transcript", chapters, runtime),
      );
      continue;
    }

    if (proposed !== null) stats.dropped += 1;
  }

  return { moments, stats };
}

/**
 * The entry the most keywords hit, earliest first on a tie. Reading a matched
 * chapter or chunk rather than taking the first one is what stops a passing
 * mention in an intro outranking the section that teaches the topic.
 */
function bestMatch<T extends { startSeconds: number }>(
  entries: T[],
  tokens: string[],
  textOf: (entry: T) => string,
) {
  let best: { entry: T; hits: number } | null = null;

  for (const entry of entries) {
    const text = textOf(entry).toLowerCase();
    const hits = tokens.filter((token) => text.includes(token)).length;

    if (hits === 0) continue;

    if (
      !best ||
      hits > best.hits ||
      (hits === best.hits && entry.startSeconds < best.entry.startSeconds)
    ) {
      best = { entry, hits };
    }
  }

  return best?.entry ?? null;
}

/**
 * A resolved second, plus how long it runs for and which chapter it falls in.
 *
 * The clip runs to the next chapter, or to the end of the video when the moment
 * is in the last chapter or came out of the transcript. A video with no chapters
 * has no boundaries at all, so its clip is simply what is left to watch.
 */
function buildMoment(
  startSeconds: number,
  source: ResolvedMoment["source"],
  chapters: { startSeconds: number; label: string | null }[],
  runtime: number,
): ResolvedMoment {
  const next = chapters.find((chapter) => chapter.startSeconds > startSeconds);
  const containing = [...chapters]
    .reverse()
    .find((chapter) => chapter.startSeconds <= startSeconds);

  const end = next?.startSeconds ?? runtime;

  return {
    startSeconds,
    clipSeconds: end > startSeconds ? end - startSeconds : 0,
    chapterLabel: containing?.label ?? null,
    source,
  };
}
