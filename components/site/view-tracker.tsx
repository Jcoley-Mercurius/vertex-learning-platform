"use client";

import { useEffect, useRef } from "react";
import posthog from "posthog-js";

/**
 * Fires one view event when the page mounts, and nothing else. Rendered by the
 * catalog, the course page and the lesson page so all three report the same way
 * (AGENTS.md section 7).
 *
 * The pages themselves are server components, so this is the seam where a view
 * becomes an event. Capturing on mount is synchronising with an external system
 * — it is not reacting to state, and every other capture in the app lives in the
 * event handler that caused it.
 */
export function ViewTracker({
  event,
  properties,
}: {
  event: string;
  properties: Record<string, unknown>;
}) {
  /* Guards the double mount React runs in development, and re-renders after. */
  const captured = useRef<string | null>(null);

  useEffect(() => {
    const key = `${event}:${JSON.stringify(properties)}`;
    if (captured.current === key) return;

    captured.current = key;
    posthog.capture(event, properties);
  }, [event, properties]);

  return null;
}
