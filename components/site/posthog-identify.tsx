"use client";

import { useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import posthog from "posthog-js";

/**
 * Identifies the signed-in Clerk user in PostHog so that analytics events,
 * session replays, and error traces are linked to the same person.
 * Rendered inside ClerkProvider in the root layout.
 */
export function PostHogIdentify() {
  const { isLoaded, isSignedIn, user } = useUser();
  // Track previous sign-in state so we only reset on logout, not on initial
  // anonymous page loads (resetting an anonymous id discards its history).
  const wasSignedIn = useRef(false);

  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn && user) {
      wasSignedIn.current = true;
      posthog.identify(user.id, {
        email: user.primaryEmailAddress?.emailAddress,
        name: user.fullName ?? undefined,
      });
    } else if (wasSignedIn.current) {
      // Only reset when transitioning from signed-in → signed-out (logout).
      wasSignedIn.current = false;
      posthog.reset();
    }
  }, [isLoaded, isSignedIn, user]);

  return null;
}
