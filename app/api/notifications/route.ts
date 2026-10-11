import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { captureServerEvent, captureServerException, resolveIdentity } from "@/lib/analytics";
import { deriveNotifications, unreadCount, type NotificationCourse } from "@/lib/notifications";
import { isClerkUserId, progressDocId } from "@/lib/progress";
import { readProgress } from "@/lib/progress-server";
import { client } from "@/sanity/lib/client";
import { getWriteClient } from "@/sanity/lib/write-client";
import { NOTIFICATIONS_CATALOG_QUERY } from "@/sanity/lib/queries";

/**
 * The learner's notification feed (AGENTS.md sections 5 and 7).
 *
 * `GET` stores nothing and reads nothing but the caller's own state: the feed is
 * derived per request from the catalog and the learner's progress, so there is
 * no notification document, no fan-out on publish, and nothing to backfill.
 *
 * `POST` writes the single field the feed does persist —
 * `notificationsReadAt` — through the server-only write client. As on the
 * progress route, the learner id comes from the session and nowhere else, so the
 * feed a caller sees and the record a caller marks read are always their own.
 */

/** The Sanity write client and Clerk both need Node, not the edge runtime. */
export const runtime = "nodejs";

/** As on the progress route: a guard against a hostile client, not a real budget. */
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

const EMPTY_FEED = { notifications: [], unreadCount: 0 };

/**
 * A signed-out caller gets an empty feed and a 200, matching `GET /api/progress`:
 * "nobody is signed in" is an ordinary answer, and the bell renders a sign-in
 * prompt rather than an error. The browser does not call this while signed out,
 * so this is the belt to that braces.
 */
export async function GET() {
  const { userId } = await auth();

  if (!userId || !isClerkUserId(userId)) return NextResponse.json(EMPTY_FEED);

  try {
    /* `useCdn: false` for the same reason the progress read uses it: a course
       published a minute ago should be news now, not after the CDN catches up. */
    const [progress, catalog] = await Promise.all([
      readProgress(userId),
      client
        .withConfig({ useCdn: false })
        .fetch<NotificationCourse[]>(NOTIFICATIONS_CATALOG_QUERY),
    ]);

    const notifications = deriveNotifications(progress, catalog ?? []);

    return NextResponse.json({ notifications, unreadCount: unreadCount(notifications) });
  } catch (error) {
    console.error("Notification read failed", error);
    /* Never fail the header over notifications: the bell is an overlay on a page
       that has already rendered. */
    return NextResponse.json(EMPTY_FEED);
  }
}

/** Marks the whole feed read. There is no per-item read state to keep. */
export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId || !isClerkUserId(userId)) {
    return NextResponse.json({ error: "Sign in to see your notifications." }, { status: 401 });
  }

  if (!checkRateLimit(userId)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const identity = await resolveIdentity(request);
  const now = new Date().toISOString();

  try {
    const writeClient = getWriteClient();

    /* The same upsert shape as a progress write: the deterministic document id
       means a learner who has read a notification before starting a lesson still
       ends up with exactly one record. */
    await writeClient
      .transaction()
      .createIfNotExists({
        _id: progressDocId(userId),
        _type: "progress",
        userId,
        lessons: [],
      })
      .patch(progressDocId(userId), (patch) => patch.set({ notificationsReadAt: now }))
      .commit();

    await captureServerEvent(identity, "notifications_marked_read", {});

    return NextResponse.json({ ok: true, notificationsReadAt: now });
  } catch (error) {
    console.error("Notification read-state write failed", error);
    await captureServerException(identity, error);

    return NextResponse.json({ error: "Could not update your notifications." }, { status: 500 });
  }
}
