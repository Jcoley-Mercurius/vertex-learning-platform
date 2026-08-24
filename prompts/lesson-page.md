# Implementation prompt: Lesson page

## Goal

Build the lesson page at `/lessons/[slug]` from `design/vertex-lesson.png`, wired to the seeded
Sanity content, with the lesson's video playing on the page.

Two columns under the existing site header: a curriculum sidebar (back link, course tile with
progress, module accordion with the current lesson marked "Now playing") and a main column
(breadcrumbs, `LESSON 5.1` badge, serif title, summary, meta row, bookmark button, the video
player, a `Lesson Content` / `Notes` tab pair, Overview, "In this lesson you will:", Pro Tip,
Resources) closed by a previous/next lesson bar.

Read only. Nothing on this page writes, and no Sanity token reaches the browser.

## What I read

- `AGENTS.md` — section 3 (the reference is the source of truth; reuse shipped components; desktop
  exact, responsive down to mobile with the lesson sidebar collapsing), section 5 (pages are read
  only; the Sanity client is server only; the browser never writes), section 7 (playback stays on
  the site through the provider's own embed, never a custom player; a result links with a start
  seconds param; progress surfaced as completion marks and a resume affordance; Notes tab and the
  free preview badge are presentational; PostHog instruments lesson views, video play, watch depth
  and lesson completion), section 8 (the lesson shape), section 12 (private dataset, server-side
  fetch), section 13 (checks).
- `design/vertex-lesson.png` — read in full, then 2x crops (sidebar head, sidebar module list,
  hero, player, tabs, pro tip, resources, footer bar) and pixel-sampled the backgrounds.
- `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md` —
  the server/client split for Next 16.3.2 (server page fetches, plain props into client leaves).
- `prompts/course-page.md`, `prompts/design-system.md` — the conventions and deviations already
  shipped.

No skill applies: the schema, queries and fragments this page consumes already exist, and no skill
covers page UI.

## Code I inspected

- `sanity/lib/queries.ts` — `LESSON_BY_SLUG_QUERY` already returns everything this page needs
  (title, summary, `videoUrl`, `durationSeconds`, `freePreview`, `studentCount`, `keyPoints`,
  `notes`, `proTip`, `poster`, `resources[]`, and the owning `course` with `glyph`, `level`,
  `instructor` and the full module skeleton). `LESSON_SLUGS_QUERY` exists for
  `generateStaticParams`. **No query or schema changes, so no TypeGen run.**
- `sanity/lib/live.ts` — `sanityFetch`, `serverToken` only.
- `components/ui/*` — `Breadcrumbs`, `Badge`, `Icon` (has `bookmark`, `check-circle`,
  `play-circle`, `chevron-down`, `arrow-right`, `external-link`, `clock`, `bar-chart`, `users`,
  `file-text`), `buttonClassName`, `ProgressBar`, `Card`, `cn`.
- `components/site/*` — `SiteHeader`, `CourseGlyph` / `CourseGlyphName`.
- `components/portable-text.tsx` — the notes renderer, already styled to the design tokens.
- `components/course/course-curriculum.tsx` — the accordion, timeline rule and PostHog capture
  idioms the sidebar follows; `course-progress.tsx` — the progress zero-state precedent.
- `lib/format.ts` — `formatDuration`, `formatLevel`, `formatCount`, `lessonLabel`.
- `app/globals.css` — the cream in the mockups is `--color-neutral-50`, already the body colour.
- Live dataset: 10 courses x 4 modules x 12 lessons (120 lessons), **every `videoUrl` is a
  `https://www.youtube.com/watch?v=<id>` URL**; every lesson has 3 key points, 6 note blocks and
  1 resource; `proTip` is set on some lessons only.

## Decisions and assumptions

1. **The provider's own player, not the mockup's control bar.** AGENTS.md section 7 forbids a
   custom player, so the black control strip in the reference is not reproduced. The frame is
   built exactly as designed (black, `rounded-lg`, 16:9) and a YouTube embed fills it with its own
   controls. The poster from Sanity renders as a click-to-play facade, so nothing is fetched from
   YouTube until the learner plays; the click swaps in the iframe with `autoplay=1`.
2. **Start seconds are honoured now.** `/lessons/[slug]?t=<seconds>` seeks the embed via YouTube's
   own `start` parameter, which is what search results will link to. A missing, negative or
   non-numeric `t` is treated as 0.
3. **YouTube only, by data not by assumption.** The URL parser handles `youtube.com/watch?v=`,
   `youtu.be/` and `/embed/`. A URL from any other host renders the poster and a plain message
   rather than a broken frame — per section 9, a provider is not supported until ingestion and
   playback both exist, and only YouTube is seeded.
4. **Progress is a zero state**, exactly as `CourseProgress` already does it. No progress document
   or write route exists, so the sidebar shows `0% complete` and no lesson carries a completion
   check. The components take `completedLessonIds` / `percentComplete` props, so wiring real
   progress later changes only the page. Nothing is fabricated: the mockup's "35% complete" and
   its four ticked lessons are layout, not data.
5. **The Notes tab is presentational** (section 7). It renders the tab and an empty state saying
   personal notes are not saved yet. No textarea that pretends to persist.
6. **Numbers come from the data, not the mockup.** "Module 5 of 12" becomes "Module 1 of 4" for
   the seeded courses, `LESSON 5.1` is derived from array position via `lessonLabel`, and the
   meta row shows the lesson's own duration, the course level and the lesson's student count.
7. **Layout maps onto the shipped 936px grid.** The reference's proportions (sidebar 29% / main
   60% of the content width) are kept, inside the same `max-w-[936px] px-6` container the header
   and every other page use, as `grid-cols-[17rem_1fr] gap-9`. Widening this page alone would
   misalign it with the shipped header.
8. **A lesson-specific resource card.** The shipped `ResourceCard` requires `fileType` and
   `fileSize`, which the `resource` schema does not have; the reference's card is a different
   shape anyway (icon tile, two-line title, external-link glyph). New component, in
   `components/lesson/`. `ResourceCard` is left untouched for the design-system page.
9. **Bookmark stays presentational**, as on the course hero.
10. **Body copy stays Inter, headings Playfair**, per the shipped design system.

Recorded while building:

11. **Two new icons, additively.** `play` (a bare triangle, for the play affordance that already
    sits on an orange disc — `play-circle` filled draws its own circle and reads as a donut there)
    and `lightbulb` (the Pro Tip mark). Nothing existing was restyled.
12. **`next.config.ts` gains `images.remotePatterns` for `cdn.sanity.io`.** The lesson poster is
    the first `next/image` on a rendered page; without it Next refuses the asset host at runtime.
13. **Resources are two-up, not three-up.** In the reference the main column is ~858px wide; on
    the shipped 936px grid it is ~530px, where three cards break the description onto one word per
    line. `sm:grid-cols-2`, same card.

## Files I expect to touch

- `app/lessons/[slug]/page.tsx` — new. Server component: fetch, derive module/lesson position,
  breadcrumbs, prev/next, compose.
- `lib/video.ts` — new. `parseVideoUrl(url)` -> `{ provider, id } | null` and
  `formatTimestamp` / `startSecondsFromParam` (the embed itself is built by the IFrame API).
- `components/lesson/lesson-sidebar.tsx` — new, client. Course tile + progress, module accordion,
  current lesson "Now playing", timeline rule, mobile collapse.
- `components/lesson/lesson-hero.tsx` — new, server. Lesson badge, title, summary, meta row,
  bookmark.
- `components/lesson/lesson-player.tsx` — new, client. Poster facade -> YouTube embed; PostHog
  `video_played`, `video_progress` (25/50/75) and `video_completed` via the IFrame API.
- `components/lesson/lesson-tabs.tsx` — new, client. `Lesson Content` / `Notes` tabs; the content
  panel is passed in as a prop so the notes Portable Text still renders on the server.
- `components/lesson/lesson-content.tsx` — new, server. Overview, key points, Pro Tip, Resources.
- `components/lesson/lesson-nav.tsx` — new, server. Previous/next lesson bar.
- `components/lesson/lesson-view-tracker.tsx` — new, client. Captures `lesson_viewed` once.
- `components/lesson/index.ts` — new barrel, matching `components/course/index.ts`.

Nothing in `sanity/`, `studio/` or `sanity.types.ts` changes.

## Requirements

- Desktop matches the reference: sidebar panel with a right border, the course glyph tile at 56px
  with title + `N% complete` + progress bar, a `Module N of M` header row with a chevron, numbered
  module rows (circle, title, duration) with the current module filled in primary and expanded,
  lesson rows with a dot marker on the timeline rule, the current lesson bold with `Now playing`
  in primary and a filled play circle on the right.
- Main column order: breadcrumbs (All Courses / course / module / lesson), `LESSON x.y` badge,
  Playfair title, summary, meta row (duration, level, students), bookmark button top right, the
  player, the tab bar with the active tab underlined in primary, `Overview` + notes, a rule,
  `In this lesson you will:` with primary check circles, the Pro Tip panel (primary-100 ground,
  lightbulb), a rule, `Resources` in a three-up grid, then the previous/next bar.
- Sections with no data are omitted, not stubbed: no `proTip`, no panel; no `resources`, no grid;
  no `keyPoints`, no list.
- Responsive: at `lg` the two columns; below that the sidebar collapses to a `<details>`-style
  disclosure above the main column, the resource grid drops to one column, and the prev/next bar
  stacks.
- Accessible: tabs use `role="tablist"` / `aria-selected` / `aria-controls`, the accordion uses
  `aria-expanded`, the current lesson carries `aria-current="true"`, the iframe has a title, and
  every interactive element keeps the shipped focus ring.
- `generateStaticParams` from `LESSON_SLUGS_QUERY`; `generateMetadata` with the lesson title and
  summary; `notFound()` when the slug or its owning course is missing.

## Security considerations

- All fetching is server side through `sanityFetch`; the read token stays on the server.
- No writes. Progress and bookmarks are display-only until a server route exists.
- The iframe is `youtube-nocookie.com`, with `referrerPolicy="strict-origin-when-cross-origin"`
  and a minimal `allow` list. The only value interpolated into its src is the parsed video id
  (matched against `[A-Za-z0-9_-]{6,}`) and an integer start, so no URL from the dataset can
  inject parameters.
- `?t=` is coerced with `Number.parseInt` and clamped to `[0, durationSeconds]`.
- PostHog captures carry lesson/course titles and positions only — no user content, no email.

## Acceptance criteria

1. `/lessons/<any seeded slug>` renders the full page from Sanity with no hardcoded content.
2. Clicking the poster plays the lesson's video inline; the learner is never sent to YouTube.
3. `?t=90` starts playback at 1:30.
4. The sidebar shows every module of the owning course, the current module expanded, and the
   current lesson marked `Now playing`.
5. Previous/next move through the course in curriculum order and are absent at the ends.
6. Lessons without a pro tip, resources or key points render without empty sections.
7. PostHog receives `lesson_viewed` on load, `video_played` on play, `video_progress` at 25/50/75
   and `video_completed` at the end.
8. Mobile (375px) shows the sidebar collapsed above the content, with no horizontal scroll.

## Checks to run

From the repo root (the web workspace):

- `npx tsc --noEmit`
- `npm run lint`
- `npm run build` (new route and new server code)
- `npm run dev` for the manual steps below

## Manual test steps

1. `npm run dev`, open `/courses/nextjs-app-router-in-depth`, expand a module, click a lesson.
2. Confirm the sidebar course tile, module list, and the `Now playing` lesson match the reference.
3. Click the poster; the video plays inline with YouTube's own controls.
4. Reload with `?t=90` appended; playback starts at 1:30.
5. Switch to `Notes`; the empty state shows. Switch back; the content is unchanged.
6. Use `Next Lesson` and `Previous Lesson` through a module boundary; the sidebar follows.
7. Open the first lesson of the first module: `Previous Lesson` is absent; the last lesson of the
   last module has no `Next Lesson`.
8. In the PostHog live events view, confirm `lesson_viewed`, `video_played`, `video_progress`.
9. Resize to 375px: the sidebar is a disclosure above the content, resources stack, no sideways
   scroll.
