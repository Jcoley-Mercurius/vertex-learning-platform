import "server-only";

import { getWriteClient } from "@/sanity/lib/write-client";

/**
 * Daily search quotas: the app's guard on OpenAI spend.
 *
 * Every billed search is counted in one small Sanity document per UTC day,
 * per learner and site-wide. The counters live in the dataset rather than in
 * memory because a serverless deploy runs many short-lived instances, and an
 * in-memory count is per instance and gone on the next cold start.
 *
 * `inc` with `returnDocuments` is atomic, so the check is increment-then-read:
 * two concurrent searches can never both slip under the limit. An increment
 * that lands over a limit is taken straight back.
 */

/** Read per call, so a changed env value takes effect on the next deploy. */
function limit(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

export function searchEnabled() {
  return process.env.SEARCH_ENABLED !== "false";
}

export type QuotaScope = "user" | "global";

export type Reservation = { ok: true } | { ok: false; scope: QuotaScope };

/** `-` rather than `.`, so the id stays a root-path document. */
function usageDocId(now = new Date()) {
  return `searchUsage-${now.toISOString().slice(0, 10)}`;
}

/* Clerk ids are `user_` plus alphanumerics, which is a valid attribute path. */
function userPath(userId: string) {
  return `users.${userId}`;
}

async function adjust(docId: string, userId: string, by: 1 | -1) {
  const result = await getWriteClient()
    .transaction()
    .createIfNotExists({ _id: docId, _type: "searchUsage", total: 0, users: {} })
    .patch(docId, (patch) =>
      patch
        .setIfMissing({ total: 0, users: {}, [userPath(userId)]: 0 })
        .inc({ total: by, [userPath(userId)]: by }),
    )
    .commit<{ _id: string; total: number; users: Record<string, number> }>({
      returnDocuments: true,
    });

  const doc = result.find((document) => document._id === docId);

  return { total: doc?.total ?? 0, user: doc?.users?.[userId] ?? 0 };
}

/**
 * Counts one search against today's quotas, or refuses it. The caller passes
 * the returned `docId` back to `refundSearch`, so a refund lands on the same day
 * even across midnight.
 */
export async function reserveSearch(
  userId: string,
): Promise<Reservation & { docId: string }> {
  const docId = usageDocId();
  const counts = await adjust(docId, userId, 1);

  const scope: QuotaScope | null =
    counts.total > limit("SEARCH_DAILY_LIMIT_GLOBAL", 100)
      ? "global"
      : counts.user > limit("SEARCH_DAILY_LIMIT_PER_USER", 10)
        ? "user"
        : null;

  if (scope) {
    await adjust(docId, userId, -1);
    return { ok: false, scope, docId };
  }

  return { ok: true, docId };
}

/** Gives a reserved search back — used when the answer cost nothing. */
export async function refundSearch(userId: string, docId: string) {
  await adjust(docId, userId, -1);
}
