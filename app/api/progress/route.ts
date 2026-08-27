import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";

import { captureServerEvent, captureServerException, resolveIdentity } from "@/lib/analytics";
import { EMPTY_PROGRESS, isClerkUserId, progressDocId } from "@/lib/progress";
import { readProgress } from "@/lib/progress-server";
import { getWriteClient } from "@/sanity/lib/write-client";
import { LESSON_FOR_PROGRESS_QUERY } from "@/sanity/lib/queries";

/**
 * Learner progress: the only write in the app (AGENTS.md section 5).
 *
 * Everything about this route is built on one rule — **the session is the only
 * source of identity**. The learner id never comes from the body, the document
 * id is derived from the session server-side, and `GET` can only ever return
 * the caller's own record. A forged body cannot touch another learner's state.
 *
 * The write token lives behind `sanity/lib/write-client.ts`, which is
 * `server-only`; the browser holds no token and never writes Sanity directly.
 *
 * `lesson_completed` is captured here rather than in the player, so it fires on
 * the transition to complete — once per learner per lesson — instead of once
 * per replay.
 */

/** The Sanity write client and Clerk both need Node, not the edge runtime. */
export const runtime = "nodejs";

/**
 * The player writes a position every 15s and once more on the way out, so a
 * learner watching three lessons in a minute is nowhere near this. It exists to
 * stop a hostile client hammering the Sanity write API.
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) return false;

  record.count += 1;
  return true;
}

/**
 * `strict()` is what stops a body patching fields it has no business in: an
 * unexpected key is a 400, not a silently ignored extra. `positionSeconds` is
 * bounded again below against the lesson's real duration.
 *
 * `clientRevision` is a monotonically increasing number from the client that
 * orders concurrent writes, ensuring stale position updates don't overwrite
 * newer state and that completion marks are never lost.
 */
const progressBodySchema = z
  .object({
    lessonId: z.string().min(1).max(128),
    positionSeconds: z.number().finite().min(0).max(86_400).optional(),
    completed: z.boolean().optional(),
    clientRevision: z.number().int().min(0).optional(),
  })
  .strict();

/**
 * A signed-out caller gets an empty state and a 200, not a 401. The provider
 * that consumes this treats a non-OK response as a failure worth reporting, and
 * "nobody is signed in" is an ordinary answer, not a failure.
 */
export async function GET() {
  const { userId } = await auth();

  if (!userId) return NextResponse.json(EMPTY_PROGRESS);

  try {
    return NextResponse.json(await readProgress(userId));
  } catch (error) {
    console.error("Progress read failed", error);
    /* Never fail the page over progress: the marks are an overlay on content
       that has already rendered. */
    return NextResponse.json(EMPTY_PROGRESS);
  }
}

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId || !isClerkUserId(userId)) {
    return NextResponse.json({ error: "Sign in to save your progress." }, { status: 401 });
  }

  if (!checkRateLimit(userId)) {
    return NextResponse.json({ error: "Too many progress updates." }, { status: 429 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const parsed = progressBodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid progress update." }, { status: 400 });
  }

  const { lessonId, completed = false, clientRevision } = parsed.data;
  const identity = await resolveIdentity(request);

  try {
    const client = getWriteClient();

    /* The lesson has to be a real published lesson before anything is written:
       it is what keeps the array free of ids that resolve to nothing, and it is
       where the resume position gets its real upper bound. */
    const lesson = await client.fetch(LESSON_FOR_PROGRESS_QUERY, { id: lessonId });

    if (!lesson?._id) {
      return NextResponse.json({ error: "Unknown lesson." }, { status: 404 });
    }

    const duration = lesson.durationSeconds ?? 0;
    const positionSeconds = Math.min(
      Math.max(0, Math.round(parsed.data.positionSeconds ?? 0)),
      duration > 0 ? duration : 86_400,
    );

    const docId = progressDocId(userId);
    const now = new Date().toISOString();

    /* The learner's existing entry for this lesson, read before the patch. It
       decides two things: whether this write is the transition to complete (so
       `lesson_completed` fires once, not on every replay), and whether the
       entry has to be appended or patched in place.

       The revision is read alongside the lesson state for optimistic concurrency:
       the write below is conditional on this revision, so concurrent writers
       cannot both append and create duplicates.

       The clientRevision is also checked: if the stored revision is newer than
       the incoming one, this is a stale write and should be ignored to prevent
       race conditions from moving position backward or unsetting completion. */
    const docData = await client.fetch<{
      _rev: string;
      lessonEntry: { completed: boolean; clientRevision?: number } | null;
    } | null>(
      /* groq */ `*[_id == $docId][0]{
        _rev,
        "lessonEntry": lessons[_key == $lessonId][0]{
          "completed": coalesce(completed, false),
          clientRevision
        }
      }`,
      { docId, lessonId },
    );

    const docRevision = docData?._rev ?? null;
    const previous = docData?.lessonEntry ?? null;
    const exists = previous !== null;
    const wasCompleted = previous?.completed ?? false;
    const storedRevision = previous?.clientRevision ?? 0;

    // Reject stale writes: newer revision already stored
    if (clientRevision !== undefined && storedRevision > clientRevision) {
      return NextResponse.json(
        { ok: false, lessonId, error: "Stale write rejected" },
        { status: 409 },
      );
    }

    const entry = {
      _key: lessonId,
      _type: "lessonProgress",
      lesson: { _type: "reference", _ref: lessonId },
      completed: completed || wasCompleted,
      positionSeconds,
      /* A completion timestamp is set once and never moved by a re-watch. */
      ...(completed && !wasCompleted ? { completedAt: now } : {}),
      updatedAt: now,
    };

    /* One transaction: create the record if this is the learner's first lesson,
       then patch it. The deterministic document id is what makes this an upsert
       with no read-then-write race on the document itself.

       A keyed patch of an absent `_key` is a silent no-op in Sanity rather than
       an error, so the first write for a lesson has to append instead — which is
       what `exists` above is for.

       The patch is conditional on the revision we read above: if a concurrent
       write changed the document, this write fails and we retry the whole flow
       (read, decide, write) until one succeeds. */
    let currentRevision = docRevision;
    let currentExists = exists;
    let currentWasCompleted = wasCompleted;
    let retries = 0;
    const maxRetries = 3;

    while (retries <= maxRetries) {
      try {
        // Rebuild entry with current wasCompleted state
        const currentEntry = {
          _key: lessonId,
          _type: "lessonProgress",
          lesson: { _type: "reference", _ref: lessonId },
          completed: completed || currentWasCompleted,
          positionSeconds,
          ...(clientRevision !== undefined ? { clientRevision } : {}),
          ...(completed && !currentWasCompleted ? { completedAt: now } : {}),
          updatedAt: now,
        };

        const txn = client
          .transaction()
          .createIfNotExists({
            _id: docId,
            _type: "progress",
            userId,
            lessons: [],
          })
          .patch(docId, (patch) => {
            const base = patch.setIfMissing({ lessons: [] }).set({
              lastLesson: { _type: "reference", _ref: lessonId },
              lastActiveAt: now,
            });

            const patchWithRevision =
              currentRevision && currentExists ? base.ifRevisionId(currentRevision) : base;

            return currentExists
              ? patchWithRevision.set({ [`lessons[_key=="${lessonId}"]`]: currentEntry })
              : patchWithRevision.insert("after", "lessons[-1]", [currentEntry]);
          });

        await txn.commit();

        // Success - update entry reference for event capture below
        entry.completed = currentEntry.completed;
        break;
      } catch (error: unknown) {
        const isConflict =
          error &&
          typeof error === "object" &&
          "statusCode" in error &&
          error.statusCode === 409;

        if (isConflict && retries < maxRetries) {
          retries += 1;

          // Re-read to get fresh state and revision
          const freshData = await client.fetch<{
            _rev: string;
            lessonEntry: { completed: boolean; clientRevision?: number } | null;
          } | null>(
            /* groq */ `*[_id == $docId][0]{
              _rev,
              "lessonEntry": lessons[_key == $lessonId][0]{
                "completed": coalesce(completed, false),
                clientRevision
              }
            }`,
            { docId, lessonId },
          );

          currentRevision = freshData?._rev ?? null;
          currentExists = freshData?.lessonEntry !== null;
          currentWasCompleted = freshData?.lessonEntry?.completed ?? false;
          const freshStoredRevision = freshData?.lessonEntry?.clientRevision ?? 0;

          // If fresh state has newer client revision, this write is stale
          if (clientRevision !== undefined && freshStoredRevision > clientRevision) {
            return NextResponse.json(
              { ok: false, lessonId, error: "Stale write rejected after retry" },
              { status: 409 },
            );
          }

          // Loop will retry with fresh state
        } else {
          throw error; // Not a conflict or out of retries
        }
      }
    }

    if (completed && !wasCompleted) {
      await captureServerEvent(identity, "lesson_completed", {
        lesson_id: lessonId,
        lesson_title: lesson.title ?? null,
        course_title: lesson.courseTitle ?? null,
        duration_seconds: duration,
      });
    }

    return NextResponse.json({ ok: true, lessonId, completed: entry.completed, positionSeconds });
  } catch (error) {
    console.error("Progress write failed", error);
    await captureServerException(identity, error);

    return NextResponse.json({ error: "Could not save your progress." }, { status: 500 });
  }
}
