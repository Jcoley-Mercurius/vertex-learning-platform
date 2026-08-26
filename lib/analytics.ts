import "server-only";
import { auth } from "@clerk/nextjs/server";

import { getPostHogClient } from "@/lib/posthog-server";

/**
 * Server-side capture (AGENTS.md section 5). Search happens in a route handler,
 * so that is where it is measured: the server is the only place that knows how
 * long the search took and what the model actually returned, and a capture from
 * here cannot be dropped by a tracking blocker.
 *
 * Identity comes from the browser. posthog-js sends its distinct id and session
 * id on the request (`X-POSTHOG-DISTINCT-ID` / `X-POSTHOG-SESSION-ID`), which is
 * what stitches a server event onto the same person and the same session replay
 * as the client events around it. A signed-in learner's Clerk id always wins over
 * the header, so a forged header cannot attribute events to another account.
 */

/** The longest free text we keep. Search queries are the only text captured. */
const MAX_TEXT = 200;

type Identity = {
  distinctId: string;
  sessionId: string | null;
};

/** Reads the correlation headers posthog-js sent alongside the request. */
export async function resolveIdentity(request: Request): Promise<Identity> {
  const headerId = request.headers.get("x-posthog-distinct-id");
  const sessionId = request.headers.get("x-posthog-session-id");

  let userId: string | null = null;

  try {
    ({ userId } = await auth());
  } catch {
    // A route reached without the Clerk middleware still gets to be measured.
  }

  return {
    // Clerk first: it is the only identifier here the browser cannot choose.
    distinctId: userId ?? headerId ?? crypto.randomUUID(),
    sessionId: sessionId && sessionId !== "null" ? sessionId : null,
  };
}

/**
 * Captures one event and waits for it to leave the process. The client is a
 * shared singleton configured to send immediately, and a Next.js route handler
 * is torn down per invocation, so an un-awaited capture is a dropped event.
 *
 * Never throws: analytics does not get to fail a request.
 */
export async function captureServerEvent(
  identity: Identity,
  event: string,
  properties: Record<string, unknown> = {},
) {
  const posthog = getPostHogClient();
  if (!posthog) return;

  try {
    posthog.capture({
      distinctId: identity.distinctId,
      event,
      properties: {
        ...properties,
        ...(identity.sessionId ? { $session_id: identity.sessionId } : {}),
      },
    });

    await posthog.flush();
  } catch (error) {
    console.error("PostHog capture failed", error);
  }
}

/** Reports a server-side failure to Error Tracking, tied to the same person. */
export async function captureServerException(identity: Identity, error: unknown) {
  const posthog = getPostHogClient();
  if (!posthog) return;

  try {
    posthog.captureException(
      error instanceof Error ? error : new Error(String(error)),
      identity.distinctId,
      identity.sessionId ? { $session_id: identity.sessionId } : undefined,
    );

    await posthog.flush();
  } catch (failure) {
    console.error("PostHog exception capture failed", failure);
  }
}

/** Trims a search query to something safe to store as an event property. */
export function analyticsText(value: string) {
  return value.trim().slice(0, MAX_TEXT);
}
