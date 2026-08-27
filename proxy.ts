import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Browsing stays public (AGENTS.md section 7). My Learning is the one surface
 * that is a learner's own state rather than content, so it is the one route
 * gated here — in middleware, never in client code.
 *
 * The progress API protects itself in the route handler instead, because its
 * `GET` answers a signed-out caller with an empty state rather than a redirect.
 */
const isProtectedRoute = createRouteMatcher(["/my-learning(.*)"]);

export default clerkMiddleware(async (auth, request) => {
  if (isProtectedRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
