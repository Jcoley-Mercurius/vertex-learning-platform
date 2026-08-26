# PostHog event tracking for search, video and lesson engagement

## Goal

Instrument the features built since the basic PostHog setup so the funnel
`search → result opened → video played → watched → lesson finished` is
measurable end to end, following PostHog's Next.js App Router conventions.
Capture server side where the action is server side. Send no personally
identifying content beyond the Clerk user id PostHog already holds via
`identify()`.

## Skills and docs read

- `.claude/skills/integration-nextjs-app-router/SKILL.md` and its
  `references/next-js.md` (client init in `instrumentation-client.ts`,
  `posthog-node` in route handlers, `X-POSTHOG-DISTINCT-ID` /
  `X-POSTHOG-SESSION-ID` correlation headers, awaited flush on a singleton
  client, `captureException` at API boundaries, no capture in a `useEffect`
  that reacts to state).
- `AGENTS.md` sections 5, 7, 11, 13.

## Code inspected

- `instrumentation-client.ts` — client init, reverse proxy at `/ingest`.
- `lib/posthog-server.ts` — `getPostHogClient()` singleton, `flushAt: 1`,
  `flushInterval: 0`. **Currently imported nowhere: there is no server-side
  capture in the app today.**
- `components/site/posthog-identify.tsx` — Clerk id → `posthog.identify()`.
- Existing client events: `search_submitted` (home form), `search_performed`
  (search results), `lesson_viewed`, `lesson_clicked` (sidebar + curriculum),
  `lesson_tab_selected`, `module_expanded`, `curriculum_show_all_toggled`,
  `video_played`, `video_progress`, `video_completed`.
- `app/api/search/route.ts` — the server search route (MCP + model + Sanity).
- `components/search/search-result-card.tsx` — **no click tracking at all.**
- `components/lesson/lesson-player.tsx` — YouTube IFrame API, 25/50/75
  milestones on a 5s interval, `ENDED` → `video_completed`.
- `app/lessons/[slug]/page.tsx` — progress renders a hard-coded zero state.
- `app/courses/page.tsx`, `app/courses/[slug]/page.tsx` — **no view events.**

## Decisions and assumptions

1. **`search_performed` moves server side.** The search route is where the
   search actually happens, it is the only place that knows latency and the
   real result mix, and it cannot be blocked by an ad blocker. The client
   capture in `components/search/search-results.tsx` is removed so the event
   is not double counted.
2. **Identity is carried on the fetch, not inferred.** `search-results.tsx`
   sends `X-POSTHOG-DISTINCT-ID: posthog.get_distinct_id()` and
   `X-POSTHOG-SESSION-ID: posthog.get_session_id()` on the `/api/search`
   POST. The route prefers the Clerk `userId` from `auth()` as `distinctId`
   and falls back to the header, and always sets `$session_id` so the event
   joins the browser session and its replay. Explicit headers are used rather
   than posthog-js `tracing_headers`, because that option matches on hostname
   and our call is a same-origin relative URL whose host differs per
   environment.
3. **The query text is captured**, as asked, on `search_submitted`,
   `search_performed` and `search_result_opened`. A learning-platform search
   query is the analytic payload of the event — without it there is no way to
   see what learners look for or what returns nothing. Noted because the
   PostHog skill's blanket rule says no user-generated content in event
   properties; this is the deliberate, scoped exception. Query text is
   trimmed and truncated to 200 chars. No other free text, no email, no name.
4. **Event names are normalised to `object_verb`, past tense, snake_case.**
   `video_progress` → `video_milestone_reached`. Everything else already fits.
   Renaming is safe: nothing is in production yet.
5. **True watch depth needs an end-of-watch event.** Milestones alone leave a
   learner who stops at 40% invisible. A `video_watch_ended` fires on unmount,
   pagehide and pause-after-idle, carrying `percent_watched` and
   `seconds_watched`, so watch depth is a distribution, not three buckets.
6. **`resume_used` and `lesson_completed` cannot be built as asked.** There is
   no progress backend, no resume affordance and no completion control in the
   app — `app/lessons/[slug]/page.tsx:126` renders a hard-coded zero state.
   What exists instead, and what this prompt delivers:
   - `video_played` gains `deep_linked` + `start_seconds`, which measures the
     one resume-shaped behaviour that does exist today: arriving at
     `/lessons/<slug>?t=<n>` from a search video result.
   - `video_completed` gains full lesson identity, so it is a usable interim
     proxy for lesson completion.
   The real `resume_used` and `lesson_completed` events are deferred to the
   progress feature and called out in the report.
7. `ViewTracker` replaces `LessonViewTracker` as one shared mount-once
   component, so catalog, course and lesson views all capture the same way.
   Firing once on mount is synchronising with an external system, which is the
   sanctioned use of `useEffect`; every other new capture lives in its event
   handler.
8. No new env vars. `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` already covers both
   sides, and a missing token stays a silent no-op in production and a loud
   console error in development, exactly as today.

## Event plan

### Server side (`posthog-node`, in `app/api/search/route.ts`)

| Event | Properties |
| --- | --- |
| `search_performed` | `query`, `query_length`, `result_count`, `course_count`, `video_result_count`, `lesson_result_count`, `has_results`, `duration_ms`, `model`, `$session_id` |
| `search_failed` | `query_length`, `reason` (`timeout` \| `mcp` \| `model` \| `unknown`), `duration_ms`, `$session_id` |

Plus `captureException` on the route's catch, per the skill's API-boundary
rule. Both paths `await posthog.flush()` before the response returns, because
the client is a shared singleton and the handler is torn down per invocation.
Analytics never changes the response: every capture is wrapped so a PostHog
failure cannot fail a search.

### Client side

| Event | Where | Properties |
| --- | --- | --- |
| `search_submitted` | `components/site/search-form.tsx`, and the results-page form in `search-results.tsx` | `query`, `query_length`, `source` (`home_hero` \| `results_page`) |
| `search_result_opened` | `components/search/search-result-card.tsx` (link `onClick`) | `result_type` (`video` \| `lesson`), `result_position`, `result_count`, `sort`, `query`, `lesson_id`, `lesson_title`, `course_title`, `module_number`, `lesson_number`, `start_seconds` (video only) |
| `search_sorted` | `search-results.tsx` sort `onChange` | `sort`, `previous_sort`, `result_count`, `query` |
| `catalog_opened_from_search` | `search-results.tsx` catalog band | `query`, `result_count`, `had_results` — named for what it measures, since the band shows on every result set, not only an empty one |
| `video_played` | `lesson-player.tsx` | existing analytics + `start_seconds`, `deep_linked`, `video_provider`, `duration_seconds` |
| `video_milestone_reached` (was `video_progress`) | `lesson-player.tsx` | analytics + `percent`, `seconds_watched`, `duration_seconds` |
| `video_watch_ended` | `lesson-player.tsx` (unmount / pagehide) | analytics + `percent_watched`, `seconds_watched`, `duration_seconds`, `completed` |
| `video_completed` | `lesson-player.tsx` | analytics + `duration_seconds`, `deep_linked` |
| `catalog_viewed` | `app/courses/page.tsx` via `ViewTracker` | `course_count` |
| `course_viewed` | `app/courses/[slug]/page.tsx` via `ViewTracker` | `course_id`, `course_title`, `course_slug`, `level`, `module_count`, `lesson_count`, `is_popular` |
| `lesson_viewed` | unchanged trigger, now via `ViewTracker` | existing + `course_slug`, `deep_linked`, `start_seconds`, `has_video` |

Untouched and already correct: `lesson_clicked`, `lesson_tab_selected`,
`module_expanded`, `curriculum_show_all_toggled`.

## Files expected to change

- `app/api/search/route.ts` — server capture, timing, failure reason,
  `captureException`, awaited flush.
- `lib/analytics.ts` *(new)* — shared server helper: resolve `distinctId`
  (Clerk id → header → generated anonymous), read the session header, capture,
  flush, swallow errors.
- `lib/search/types.ts` — only if the response needs a result-kind count; the
  route can derive it locally, in which case this file is untouched.
- `components/search/search-results.tsx` — drop the client
  `search_performed`, send correlation headers, add `search_submitted`
  (results form), `search_sorted`, catalog-band click, thread rank/sort/query
  down to the card.
- `components/search/search-result-card.tsx` — `search_result_opened`;
  becomes a client component.
- `components/site/search-form.tsx` — `query` + `source`.
- `components/lesson/lesson-player.tsx` — enriched play/milestone/complete,
  new `video_watch_ended`.
- `components/site/view-tracker.tsx` *(new)*, `components/site/index.ts`.
- `components/lesson/lesson-view-tracker.tsx` — deleted, callers moved to
  `ViewTracker`; `components/lesson/index.ts` updated.
- `app/lessons/[slug]/page.tsx`, `app/courses/page.tsx`,
  `app/courses/[slug]/page.tsx` — mount the view trackers.

## Security and privacy

- The PostHog project token is public by design and is the only key used on
  either side. No private PostHog API key is introduced, so nothing new lands
  in env.
- Person identity stays where it belongs: email and name only in
  `identify()`, never in `capture()` properties. Event properties carry the
  Clerk user id (as `distinctId`) and content metadata only.
- Search query text is the single piece of user-entered text captured, by
  explicit request, trimmed and capped at 200 characters.
- The correlation headers are advisory: the route trusts Clerk's `userId`
  over the client-supplied distinct id whenever the learner is signed in, so
  a forged header cannot attribute events to another account.
- No token, MCP call or model call moves to the browser. The route keeps its
  existing server-only boundary.

## Acceptance criteria

1. A search fires exactly one `search_performed`, from the server, carrying
   the query, the counts and `duration_ms`, on the same distinct id and
   session as the browser's events.
2. A failed search fires `search_failed` with a reason and an exception,
   and the learner still sees the existing error state.
3. Clicking any result fires `search_result_opened` with `result_type` and
   its rank.
4. Playing a lesson video fires `video_played`; passing 25/50/75% fires
   `video_milestone_reached` once each; leaving fires exactly one
   `video_watch_ended` with a real `percent_watched`; finishing fires
   `video_completed`.
5. Catalog, course and lesson pages each fire one view event per visit.
6. No event property contains an email, a name, or any free text other than
   the search query.
7. `npx tsc --noEmit` and `npm run lint` are clean; `npm run build` succeeds.
8. Nothing in the UI changes visually.

## Checks to run

From the web workspace root:

- `npx tsc --noEmit`
- `npm run lint`
- `npm run build` (route handler, config-adjacent and server module changes)
- `npm run dev` for the manual pass below

## Manual test steps

1. `npm run dev`, open `http://localhost:3000` with the browser console open
   (posthog `debug` is on in development).
2. Search from the home hero → console shows `search_submitted` with the
   query and `source: "home_hero"`.
3. On the results page, watch the server terminal and the PostHog activity
   feed: one `search_performed` with `query`, `result_count`, `course_count`
   and `duration_ms`. Confirm the console shows no client `search_performed`.
4. Change the sort → `search_sorted`. Click a **Video** result →
   `search_result_opened` with `result_type: "video"`, its `result_position`
   and `start_seconds`.
5. On the lesson page: `lesson_viewed` with `deep_linked: true`. Press play →
   `video_played` with `deep_linked: true`. Let it run past 25% and 50% →
   two `video_milestone_reached`. Navigate away → one `video_watch_ended`
   with a matching `percent_watched`.
6. Back to the results page, click a **Lesson** result → `result_type:
   "lesson"`, and the lesson page reports `deep_linked: false`.
7. Visit `/courses` → `catalog_viewed`; open a course → `course_viewed`.
8. In PostHog, confirm every event above shares one person and one session,
   and that a signed-in run attributes `search_performed` to the Clerk user id.
9. Temporarily unset `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and reload: the app
   still renders and search still works, with the existing console error.
