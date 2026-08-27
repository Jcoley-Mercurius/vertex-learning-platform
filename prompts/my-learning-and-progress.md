# Implementation prompt: My Learning page + learner progress backend

## Goal

Two things, in this order:

1. **The progress backend** (AGENTS.md sections 5, 7, 8). A `progress` document in Sanity keyed by
   the Clerk user id, holding which lessons a learner completed and where they left off, written
   only through a server route with a write token, and read back through a server route.
2. **The My Learning page** at `/my-learning`, protected by Clerk, showing the learner's courses
   split into Continue Learning / Completed / Not started, built from the components and Tailwind
   patterns already in the repo.

Then surface progress where AGENTS.md section 7 says it belongs: completion marks and a resume
affordance on the **catalog**, the **course page**, and the **lesson page**.

The browser never writes Sanity directly and never holds a token. Every write goes through
`/api/progress`.

## Decisions confirmed with the user

Asked in the question panel before writing this prompt:

1. **Design source: reuse existing patterns.** There is no `design/vertex-my-learning.png`, so the
   page is assembled from the shipped design system (`SiteHeader`, `CourseCard`, `ProgressBar`,
   `Badge`, `buttonClassName`, the 936px column and the type scale `/courses` uses). No new visual
   language is invented and nothing already designed is restyled.
2. **Scope: build the progress backend too**, not just a presentational page. This deliberately
   goes beyond AGENTS.md section 7's "My Learning is presentational" line — the user chose it, and
   section 7's progress bullet ("tracked per learner… surfaced on the catalog, course, and lesson
   pages") is the spec being built to.
3. **`/my-learning` is a protected route**, gated in `proxy.ts`. Everything else stays public.

## What I read

- `AGENTS.md` — section 3 (reuse shipped components; desktop exact, responsive to mobile),
  section 5 (pages read only; writes go through a server route; no token in the browser; progress
  keyed off the Clerk user id and kept apart from read-only content), section 7 (progress tracked
  per learner: completed lessons + resume position, surfaced as completion marks and a resume
  affordance on catalog/course/lesson; My Learning presentational, may read existing progress;
  PostHog instruments lesson completion), section 8 (the progress record shape), section 12
  (private dataset, server-only tokens, Clerk secret server-only), section 13 (checks).
- `skills/sanity-best-practices` — `SKILL.md` global rules, `references/schema.md` (document ids,
  the deprecation lifecycle, validation), `references/nextjs.md` (CDN vs API freshness — a write
  followed by a CDN read is stale, so progress reads use `useCdn: false`).
- `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md` — Route Handlers in
  16.3.2: not cached by default, `NextResponse`, no `route.ts` beside a `page.tsx` in the same
  segment.
- `prompts/clerk-auth-controls.md` — which already parked this work: "Protection is per-route with
  `await auth.protect()` when the protected features land (progress, My Learning writes)."
- `prompts/lesson-page.md`, `prompts/course-page.md`, `prompts/design-system.md` — shipped
  conventions.

`create-agent-with-sanity-context`, `dial-your-context` and `shape-your-agent` do not apply: search
is untouched.

## Code I inspected

- `studio/schemaTypes/index.ts`, `documents/lesson.ts`, `studio/structure.ts` — schema registration
  and the Studio desk. The structure lists content types explicitly, so a new type is invisible
  unless added.
- `sanity/lib/client.ts`, `token.ts`, `live.ts`, `env.ts` — the read client carries the read token
  because `defineLive` only attaches `serverToken` on draft perspectives; `browserToken` is
  deliberately unset. There is **no write client and no write token yet**.
- `sanity/lib/queries.ts`, `fragments.ts` — `COURSES_CATALOG_QUERY`, `COURSE_BY_SLUG_QUERY`,
  `LESSON_BY_SLUG_QUERY`, `courseCardFragment`, `courseTotalsFragment`.
- `app/courses/page.tsx`, `app/courses/[slug]/page.tsx`, `app/lessons/[slug]/page.tsx` — all three
  are static (`generateStaticParams`, `perspective: "published"`, `stega: false`) and **none calls
  `auth()`**. The course page passes `progress={null}` with `label="Start Learning"`; the lesson
  page passes `percentComplete={0}` and `completed: false` everywhere.
- `components/course/course-progress.tsx` — already written for the real shape: takes
  `progress: number | null`, `href`, `label`.
- `components/lesson/lesson-sidebar.tsx` — `SidebarModule` / `SidebarLesson` already carry
  `completed` and the sidebar already takes `percentComplete`.
- `components/course/course-curriculum.tsx` — `CurriculumLesson` has **no** `completed` field; this
  is the one component that needs a prop added.
- `components/ui/*` — `ProgressBar`, `CourseCard` (`inline` | `stacked`), `Badge`, `Icon` (has
  `check-circle`, `play-circle`, `arrow-right`, `clock`, `bar-chart`), `buttonClassName`, `cn`.
- `components/site/view-tracker.tsx` — the mount-once capture idiom; `site-header.tsx` already
  links to `/my-learning` (currently a 404).
- `components/lesson/lesson-player.tsx` — YouTube IFrame API player, a 5s progress interval, a
  `pagehide` + unmount `endWatch`, and an `ENDED` handler whose comment says "Until progress has a
  backend, finishing the video is the closest thing the app has to a completed lesson." This is
  exactly where the resume/complete writes hang.
- `app/api/search/route.ts` — the server-route conventions to copy: `runtime = "nodejs"`, Clerk
  `auth()`, Zod validation, in-memory rate limiting, `captureServerEvent` / `captureServerException`
  with `resolveIdentity`.
- `lib/analytics.ts` — `resolveIdentity` prefers the Clerk id over the browser-supplied header.
- `proxy.ts` — bare `clerkMiddleware()` with a matcher, no route protection yet.
- `.env.example` — the canonical env list; no write token entry yet.
- `prompts/search-context-tuning.md` — the live `sanity.agentContext.vertex-search` `groqFilter` is
  an **allowlist**: `_type in ["course", "lesson", "instructor", "category", "video"]`. A new
  `progress` type is therefore invisible to the search agent with no context change. Confirm, do
  not edit.

## Decisions and assumptions

1. **One `progress` document per learner, id `progress.<clerkUserId>`.** The skill's global rule
   says let Sanity generate ids, with an explicit carve-out for singletons. A learner's progress
   record is a singleton per user, and a deterministic id is what makes the write idempotent:
   `createIfNotExists` + `patch` in one transaction, with no read-then-write race and no chance of
   two documents for one learner. Clerk ids (`user_2ab…`) are already legal Sanity id characters;
   sanitise defensively anyway (`[^a-zA-Z0-9._-]` → `-`) and reject anything that does not match
   `^user_[a-zA-Z0-9]+$`.
2. **Lesson progress is an array inside that one document**, keyed by lesson id
   (`_key` = the lesson `_id`), not a document per lesson. The dataset is 120 lessons, so the array
   stays small, and My Learning then needs exactly one fetch instead of one per course.
3. **The progress document is app state, not content.** It gets its own `progress` type, is **not**
   added to `studio/structure.ts` (nothing for an author to edit), stores `userId` as a plain string
   (Clerk is the system of record, not Sanity), and links lessons by `reference` so a deleted lesson
   does not leave a dangling id the UI has to guess about.
4. **Pages stay static.** Calling `auth()` inside `/courses`, `/courses/[slug]` or `/lessons/[slug]`
   would turn three prerendered pages into per-request renders for anonymous visitors too. Instead
   those pages keep rendering the zero state on the server, and a client hook overlays the
   learner's marks after hydration from a single `GET /api/progress`. `/my-learning` is the one page
   that is dynamic by nature, and it reads progress **server-side**.
5. **One shared client fetch, not one per component.** A `ProgressProvider` in `app/layout.tsx`
   fetches `GET /api/progress` **once, only when Clerk reports a signed-in user**, and shares it by
   context. Signed-out visitors make no request at all.
6. **Resume writes are throttled, completion writes are immediate.** The player already ticks every
   5s; position is POSTed at most every 15s and once more on `pagehide`/unmount via
   `fetch(..., { keepalive: true })`. `ENDED` posts `completed: true` immediately and replaces the
   player's "no backend yet" comment.
7. **A lesson counts as complete** when the video reaches its end (the existing `ENDED` handler).
   No manual "mark complete" control is added — there is no design for one.
8. **Course percentage is derived, never stored.** `completedLessons / totalLessons` per course,
   computed from the curriculum, exactly as module and lesson numbers are derived (AGENTS.md §7).
9. **Progress reads bypass the CDN** (`useCdn: false`). A learner who just finished a lesson and
   opens My Learning must not see the pre-write copy.
10. **`SANITY_API_WRITE_TOKEN` is a new server-only env var** with its own `server-only` module,
    mirroring `token.ts`. It never appears in a `NEXT_PUBLIC_*` name and never reaches the browser.
11. **My Learning ordering:** Continue Learning first, most recently touched first
    (`lastActiveAt`), then Completed, then Not started (catalog order). A learner with no progress
    at all sees an empty state pointing at `/courses`, matching the catalog's empty-state voice.

## Files I expect to touch

**Studio**
- `studio/schemaTypes/documents/progress.ts` — new. `progress` type: `userId` (string, required),
  `lessons[]` of a new `lessonProgress` object, `lastLesson` (reference), `lastActiveAt` (datetime).
  `readOnly: true` on the type so nobody hand-edits app state in the Studio.
- `studio/schemaTypes/objects/lesson-progress.ts` — new. `{ lesson: reference→lesson, completed:
  boolean, positionSeconds: number, completedAt: datetime, updatedAt: datetime }`.
- `studio/schemaTypes/index.ts` — register both.
- `studio/structure.ts` — **unchanged** (deliberately; note it in a comment there).

**Web — data layer**
- `sanity/lib/write-token.ts` — new, `server-only`, asserts `SANITY_API_WRITE_TOKEN`.
- `sanity/lib/write-client.ts` — new, `server-only`, `useCdn: false`, the write token, used only
  from `/api/progress`.
- `sanity/lib/queries.ts` — new `PROGRESS_BY_USER_QUERY` (the learner's record, lessons projected to
  `{ lessonId, completed, positionSeconds, updatedAt }`) and `MY_LEARNING_QUERY` (catalog courses
  plus each course's flat lesson id list, so percentages can be derived).
- `sanity.types.ts` — regenerated by TypeGen, not hand-edited.
- `lib/progress.ts` — new, pure helpers shared by server and client: `courseProgress(lessonIds,
  completedIds)` → `{ completed, total, percent }`, `resumeTarget(...)` → the next incomplete
  lesson, `progressDocId(userId)`.

**Web — server route**
- `app/api/progress/route.ts` — new. `runtime = "nodejs"`.
  - `GET`: `auth()`; signed out → `{ lessons: [], lastLesson: null }` with 200 (not a 401 — the
    provider must not treat "anonymous" as an error). Signed in → the learner's record.
  - `POST`: `await auth.protect()`; Zod body `{ lessonId, positionSeconds?, completed? }`;
    `lessonId` verified to be a real published lesson before it is written; a
    `createIfNotExists` + `patch` transaction; in-memory rate limit copied from the search route;
    `captureServerException` on failure. Never throws to the client.
  - PostHog: `lesson_completed` captured **server-side** on the transition to `completed: true`, so
    it fires once per learner per lesson rather than once per replay.

**Web — pages and components**
- `app/my-learning/page.tsx` — new, protected, server component, `ViewTracker` for
  `my_learning_viewed`.
- `components/my-learning/` — new: `learning-summary.tsx` (the stats row: courses in progress,
  lessons completed, time watched), `learning-course-card.tsx` (a `CourseCard`-shaped card with a
  `ProgressBar` and a Continue/Start/Review action), `index.ts`.
- `components/progress/progress-provider.tsx` — new client provider + `useProgress()` hook.
- `components/progress/index.ts` — new.
- `app/layout.tsx` — mount `ProgressProvider`.
- `proxy.ts` — `createRouteMatcher(["/my-learning(.*)"])` → `auth.protect()`.
- `components/lesson/lesson-player.tsx` — position + completion writes; replace the stale comment.
- `components/lesson/lesson-sidebar.tsx` — consume `useProgress()` for live completion marks
  (props stay the server-rendered zero state, the hook overlays).
- `components/course/course-curriculum.tsx` — add `completed` to `CurriculumLesson` and render the
  mark.
- `components/course/course-progress.tsx` — unchanged shape; the course page now feeds it real
  values through a small client wrapper.
- `app/courses/[slug]/page.tsx`, `app/courses/page.tsx`, `app/lessons/[slug]/page.tsx` — swap the
  hardcoded zero states for the progress-aware wrappers. **No `auth()` in any of them.**
- `.env.example` — add `SANITY_API_WRITE_TOKEN` under Sanity, marked SERVER ONLY.

## Requirements

- Progress is keyed by the Clerk user id, taken from `auth()` on the server. A user id in a request
  body is ignored — the session is the only source.
- No Sanity token, write or read, in any client component or any `NEXT_PUBLIC_*` var.
- The write route validates its body with Zod, bounds `positionSeconds` to the lesson's duration,
  and rejects a `lessonId` that is not a published lesson.
- `/my-learning` redirects a signed-out visitor to sign-in via middleware.
- Pages that are static today stay static: no `auth()`, `cookies()` or `headers()` added to them.
- Reuse existing components and Tailwind tokens; add no new colours or type sizes.
- Responsive to mobile: the summary row wraps, the card grid collapses to one column.
- TypeGen is re-run because the schema and the queries both change.

## Security considerations

- **Server-only write token.** New file, `import "server-only"` at the top, same guard as
  `token.ts`. A client import becomes a build error, not a leak.
- **Session is authority.** `auth()` server-side only; a forged `userId` in a body cannot write to
  another learner's record. `GET` returns only the caller's own record.
- **No IDOR through the id scheme.** The deterministic id is derived server-side from the session
  id, never from input.
- **Input bounds.** Zod caps `positionSeconds`, and unknown keys are stripped, so a body cannot
  patch arbitrary fields on the document.
- **Rate limiting.** The player writes on a timer; the same in-memory limiter the search route uses
  keeps a hostile client from hammering the Sanity write API.
- **Blast radius of the write token.** It can write the whole dataset; only `/api/progress` imports
  it, and it only ever patches `progress.*` ids.
- **The search agent cannot see progress.** The Context `groqFilter` is an allowlist of the five
  content types — verify it still is, and do not widen it. Learner state must never surface in a
  search result.
- **PII.** The progress document stores a Clerk user id and nothing else about the person: no email,
  no name.

## Acceptance criteria

1. Signing in, playing a lesson to the end, and reloading shows that lesson marked complete in the
   lesson sidebar and in the course curriculum.
2. Leaving a lesson part-way and returning to `/my-learning` shows that course under Continue
   Learning with a non-zero percentage and a Continue action pointing at the next incomplete lesson.
3. `/my-learning` signed out redirects to sign-in; signed in with no progress shows the empty state
   linking to `/courses`.
4. The course page's progress band shows the real percentage and reads "Continue Learning" once
   there is progress, "Start Learning" at zero.
5. Catalog cards show a progress bar only for courses the signed-in learner has started.
6. `curl -X POST /api/progress` unauthenticated returns 401/redirect and writes nothing.
7. No `SANITY_API_WRITE_TOKEN` string appears in any client bundle (`grep` the `.next/static` output).
8. `/courses`, `/courses/[slug]` and `/lessons/[slug]` are still statically prerendered in the build
   output.
9. Signed-out browsing makes **zero** requests to `/api/progress`.
10. A `progress` document exists in the dataset with the expected shape and is absent from the
    Studio desk.

## Checks to run

- `npm run lint`
- `npx tsc --noEmit`
- `npm run build` — routes, middleware and server modules all change; also the source for
  acceptance criteria 7 and 8.
- `npm --prefix studio run typegen` — schema and queries changed.
- `npm --prefix studio run schema:deploy` — the new types must reach the deployed schema.
- `npm run dev` — for the manual steps below.

## Manual test steps

1. Add `SANITY_API_WRITE_TOKEN` (Sanity Manage → API → Tokens → **Editor**) to `.env.local`.
2. `npm run dev`, open `/my-learning` signed out → redirected to sign-in.
3. Sign in → `/my-learning` shows the empty state with a link to `/courses`.
4. Open any course → the band reads 0% / "Start Learning". Open its first lesson, play the video,
   let it run ~20s, then navigate away.
5. Back on `/my-learning` → that course is under Continue Learning with a Continue action.
6. Reopen the lesson, skip to the end so the player fires `ENDED`, reload → the sidebar and the
   course curriculum both mark it complete, and the course percentage moves.
7. `/courses` → that course's card shows its progress bar; the others do not.
8. Sign out, open `/courses` with DevTools Network filtered to `progress` → no request.
9. PostHog Activity → one `lesson_completed` per lesson, and no duplicate on replaying it.
10. `grep -r "SANITY_API_WRITE_TOKEN" .next/static` → no match.
