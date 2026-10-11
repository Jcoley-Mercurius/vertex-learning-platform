import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";

import { captureServerEvent, captureServerException, resolveIdentity } from "@/lib/analytics";
import { EMPTY_PROGRESS, MAX_NOTE_LENGTH, isClerkUserId, progressDocId } from "@/lib/progress";
import { readProgress } from "@/lib/progress-server";
import { getWriteClient } from "@/sanity/lib/write-client";
import { COURSE_FOR_BOOKMARK_QUERY, LESSON_FOR_PROGRESS_QUERY } from "@/sanity/lib/queries";

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

/** Note length as a coarse bucket. The note text is never captured. */
function noteLengthBucket(length: number): string {
  if (length === 0) return "empty";
  if (length < 200) return "short";
  if (length < 1_000) return "medium";
  return "long";
}

/**
 * `strict()` is what stops a body patching fields it has no business in: an
 * unexpected key is a 400, not a silently ignored extra. `positionSeconds` is
 * bounded again below against the lesson's real duration.
 *
 * Every field but `lessonId` is optional, and *absent means unchanged*: the
 * player writes a position, the bookmark writes a flag, the notes editor writes
 * text, and none of them may disturb the others (see the merge below).
 *
 * `clientRevision` is a monotonically increasing number from the client that
 * orders position writes, so a stale autosave cannot rewind a newer one.
 */
const lessonBodySchema = z
  .object({
    lessonId: z.string().min(1).max(128),
    positionSeconds: z.number().finite().min(0).max(86_400).optional(),
    completed: z.boolean().optional(),
    bookmarked: z.boolean().optional(),
    /* Plain text, capped here as well as in the editor. An empty string is a
       deliberate "clear my note", not a missing field. */
    note: z.string().max(MAX_NOTE_LENGTH).optional(),
    clientRevision: z.number().int().min(0).optional(),
  })
  .strict();

/**
 * The course hero's Bookmark. A course bookmark carries no position and no
 * completion — a course is not a lesson — so it is its own body shape rather
 * than more optional fields on the one above.
 */
const courseBodySchema = z
  .object({
    courseId: z.string().min(1).max(128),
    bookmarked: z.boolean(),
  })
  .strict();

const progressBodySchema = z.union([lessonBodySchema, courseBodySchema]);

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

  const identity = await resolveIdentity(request);

  /* A course bookmark writes a different array on the same document, so it
     branches here rather than threading a "kind" through the lesson path. */
  if ("courseId" in parsed.data) {
    return saveCourseBookmark(userId, parsed.data, identity);
  }

  const lessonBody = parsed.data;
  const { lessonId, completed = false, clientRevision } = lessonBody;
  /* A write that only moves the position must not clear a bookmark or a note,
     and a write that only saves a note must not rewind the player. */
  const touchesPosition = parsed.data.positionSeconds !== undefined;
  const touchesBookmark = parsed.data.bookmarked !== undefined;
  const touchesNote = parsed.data.note !== undefined;

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

       The document revision is read alongside it for optimistic concurrency:
       the write below is conditional on that revision, so two concurrent writers
       cannot both append the same lesson, and a loser re-reads and retries. */
    const readState = () =>
      client.fetch<{
        _rev: string;
        lessonEntry: {
          completed: boolean;
          positionSeconds: number;
          bookmarked: boolean;
          bookmarkedAt: string | null;
          note: string | null;
          noteUpdatedAt: string | null;
          completedAt: string | null;
          clientRevision: number | null;
        } | null;
      } | null>(
        /* groq */ `*[_id == $docId][0]{
          _rev,
          "lessonEntry": lessons[_key == $lessonId][0]{
            "completed": coalesce(completed, false),
            "positionSeconds": coalesce(positionSeconds, 0),
            "bookmarked": coalesce(bookmarked, false),
            "bookmarkedAt": bookmarkedAt,
            "note": note,
            "noteUpdatedAt": noteUpdatedAt,
            "completedAt": completedAt,
            clientRevision
          }
        }`,
        { docId, lessonId },
      );

    /* `clientRevision` orders the player's position writes, so a late
       autosave cannot rewind a newer one. Only a pure position/completion write
       is dropped as stale: a bookmark or note is a deliberate action and is
       never thrown away for arriving out of order. */
    const positionOnly = !touchesBookmark && !touchesNote;
    const isStale = (stored: number | null | undefined) =>
      positionOnly && clientRevision !== undefined && (stored ?? 0) > clientRevision;

    let state = await readState();
    const initial = state?.lessonEntry ?? null;
    const wasCompleted = initial?.completed ?? false;
    const wasBookmarked = initial?.bookmarked ?? false;

    if (isStale(initial?.clientRevision)) {
      return NextResponse.json({ ok: false, lessonId, error: "Stale write rejected" }, { status: 409 });
    }

    /* The whole entry is rewritten on every write, so anything this request did
       not touch has to be carried over from `previous` explicitly. */
    const buildEntry = (previous: typeof initial) => {
      const bookmarked = touchesBookmark ? lessonBody.bookmarked! : (previous?.bookmarked ?? false);
      const note = touchesNote ? lessonBody.note!.trim() : (previous?.note ?? null);
      const priorCompleted = previous?.completed ?? false;

      return {
        _key: lessonId,
        _type: "lessonProgress",
        lesson: { _type: "reference", _ref: lessonId },
        completed: completed || priorCompleted,
        positionSeconds: touchesPosition ? positionSeconds : (previous?.positionSeconds ?? 0),
        bookmarked,
        /* Set when the bookmark goes on, dropped when it comes off — so the
           "still on your bookmarks" nudge dates from the save, not the lesson. */
        bookmarkedAt: bookmarked ? (previous?.bookmarkedAt ?? now) : null,
        note: note ? note : null,
        noteUpdatedAt: touchesNote ? now : (previous?.noteUpdatedAt ?? null),
        /* A completion timestamp is set once and never moved by a re-watch. */
        completedAt: completed && !priorCompleted ? now : (previous?.completedAt ?? null),
        clientRevision: Math.max(clientRevision ?? 0, previous?.clientRevision ?? 0),
        updatedAt: now,
      };
    };

    /* One transaction: create the record if this is the learner's first lesson,
       then patch it. A keyed patch of an absent `_key` is a silent no-op in
       Sanity rather than an error, so the first write for a lesson has to append
       instead. The patch is conditional on the revision just read; on a 409 the
       whole flow (read, decide, write) runs again, up to a few times. */
    const MAX_RETRIES = 3;
    let entry = buildEntry(initial);

    for (let attempt = 0; ; attempt += 1) {
      const previous = state?.lessonEntry ?? null;
      const revision = state?._rev ?? null;
      entry = buildEntry(previous);

      try {
        await client
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
            const guarded = revision ? base.ifRevisionId(revision) : base;

            return previous
              ? guarded.set({ [`lessons[_key=="${lessonId}"]`]: entry })
              : guarded.insert("after", "lessons[-1]", [entry]);
          })
          .commit();
        break;
      } catch (error: unknown) {
        const isConflict =
          typeof error === "object" &&
          error !== null &&
          "statusCode" in error &&
          error.statusCode === 409;

        if (!isConflict || attempt >= MAX_RETRIES) throw error;

        state = await readState();

        if (isStale(state?.lessonEntry?.clientRevision)) {
          return NextResponse.json(
            { ok: false, lessonId, error: "Stale write rejected after retry" },
            { status: 409 },
          );
        }
      }
    }

    const { bookmarked, note } = entry;

    if (touchesBookmark && bookmarked !== wasBookmarked) {
      await captureServerEvent(
        identity,
        bookmarked ? "lesson_bookmarked" : "lesson_unbookmarked",
        {
          lesson_id: lessonId,
          lesson_title: lesson.title ?? null,
          course_title: lesson.courseTitle ?? null,
        },
      );
    }

    if (touchesNote) {
      /* The note itself never leaves the server. Its length, bucketed, is all
         the signal the engagement question needs. */
      await captureServerEvent(identity, "lesson_note_saved", {
        lesson_id: lessonId,
        lesson_title: lesson.title ?? null,
        course_title: lesson.courseTitle ?? null,
        note_length_bucket: noteLengthBucket((note ?? "").length),
        cleared: (note ?? "").length === 0,
      });
    }

    if (completed && !wasCompleted) {
      await captureServerEvent(identity, "lesson_completed", {
        lesson_id: lessonId,
        lesson_title: lesson.title ?? null,
        course_title: lesson.courseTitle ?? null,
        duration_seconds: duration,
      });
    }

    return NextResponse.json({
      ok: true,
      lessonId,
      completed: entry.completed,
      positionSeconds: entry.positionSeconds,
      bookmarked: entry.bookmarked,
      bookmarkedAt: entry.bookmarkedAt,
      note: entry.note,
      noteUpdatedAt: entry.noteUpdatedAt,
    });
  } catch (error) {
    console.error("Progress write failed", error);
    await captureServerException(identity, error);

    return NextResponse.json({ error: "Could not save your progress." }, { status: 500 });
  }
}

/**
 * Saves or clears a course bookmark.
 *
 * The same upsert shape as a lesson write — deterministic document id, one
 * transaction, a keyed array member — against `bookmarkedCourses` instead of
 * `lessons`. Unbookmarking removes the member outright rather than leaving a
 * tombstone: there is nothing else on it worth keeping.
 */
async function saveCourseBookmark(
  userId: string,
  { courseId, bookmarked }: { courseId: string; bookmarked: boolean },
  identity: Awaited<ReturnType<typeof resolveIdentity>>,
) {
  try {
    const client = getWriteClient();

    /* The course has to be a real published course before anything is written,
       for the same reason a lesson does: no id in the array that resolves to
       nothing. */
    const course = await client.fetch(COURSE_FOR_BOOKMARK_QUERY, { id: courseId });

    if (!course?._id) {
      return NextResponse.json({ error: "Unknown course." }, { status: 404 });
    }

    const docId = progressDocId(userId);
    const now = new Date().toISOString();

    const transaction = client.transaction().createIfNotExists({
      _id: docId,
      _type: "progress",
      userId,
      lessons: [],
    });

    if (bookmarked) {
      transaction.patch(docId, (patch) =>
        patch
          .setIfMissing({ bookmarkedCourses: [] })
          /* Appending a `_key` that is already there would duplicate it, so an
             unset of the same key runs first: the pair is idempotent, which is
             what a double-clicked toggle needs. */
          .unset([`bookmarkedCourses[_key=="${courseId}"]`])
          .insert("after", "bookmarkedCourses[-1]", [
            {
              _key: courseId,
              _type: "courseBookmark",
              course: { _type: "reference", _ref: courseId },
              bookmarkedAt: now,
            },
          ]),
      );
    } else {
      transaction.patch(docId, (patch) =>
        patch.unset([`bookmarkedCourses[_key=="${courseId}"]`]),
      );
    }

    await transaction.commit();

    await captureServerEvent(
      identity,
      bookmarked ? "course_bookmarked" : "course_unbookmarked",
      { course_id: courseId, course_title: course.title ?? null },
    );

    return NextResponse.json({ ok: true, courseId, bookmarked });
  } catch (error) {
    console.error("Course bookmark write failed", error);
    await captureServerException(identity, error);

    return NextResponse.json({ error: "Could not save your bookmark." }, { status: 500 });
  }
}
