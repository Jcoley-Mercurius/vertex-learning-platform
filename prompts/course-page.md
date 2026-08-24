# Implementation prompt: Course detail page

## Goal

Build the course detail page at `/courses/[slug]` from `design/vertex-course.png`, wired to the
seeded Sanity content. Five bands inside the existing site header: breadcrumbs, a hero (glyph
tile, POPULAR badge, serif title, summary, meta row, two CTAs), a "What you'll learn" card,
a "Course Content" module list with per-module accordions and a "Show all N modules" toggle,
and a bottom progress bar over the decorative accent bars.

Read only. Nothing on this page writes, and no token reaches the browser.

## What I read

- `AGENTS.md` — section 3 (the reference is the source of truth, reuse existing components,
  responsive down to mobile), section 5 (pages are read only; the Sanity client is server only),
  section 7 (module and lesson numbering derived from order; progress surfaced as completion
  marks and a resume affordance), section 8 (the course/module/lesson shape), section 13 (checks).
- `design/vertex-course.png` — read in full, then four 2x crops (hero, outcomes, course content,
  bottom bar) and pixel-sampled for the measurements below.
- `prompts/design-system.md`, `prompts/home-page.md` — the tokens and conventions already shipped,
  and the deviations the home page recorded.
- `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md` and
  `.../04-linking-and-navigating.md` — dynamic route and `generateStaticParams` conventions in
  Next 16.3.2.

The Sanity skill is not re-read: the schema, queries and fragments this page consumes already
exist and are unchanged by this work. No skill covers page UI.

## Code I inspected

- `sanity/lib/queries.ts` — `COURSE_BY_SLUG_QUERY` already returns everything this page needs
  (marketing fields, glyph, category, instructor, `learningOutcomes[]`, `modules[]` with the
  lessons dereferenced) plus `courseTotalsFragment` (`moduleCount`, `lessonCount`,
  `durationSeconds`). `COURSE_SLUGS_QUERY` exists for `generateStaticParams`. **No query changes.**
- `sanity/lib/live.ts` — `sanityFetch` with `serverToken` only; `SanityLive` is already mounted in
  `app/layout.tsx`.
- `components/ui/*` — `Breadcrumbs`, `Badge` (`popular` tone exists), `Button` /
  `buttonClassName` (`primary`, `tertiary`, sizes `md`/`lg`/`hero`), `Card`, `ProgressBar`,
  `Icon` (24x24, outline + filled), `cn`.
- `components/site/*` — `SiteHeader`, `AccentBars`, `CourseGlyph` (renders `h-full w-full`, so it
  scales to the hero tile), `CourseGlyphName`.
- `app/page.tsx` — the container it settled on (`max-w-[1440px] px-10`) and its card grid idiom.
- `studio/schemaTypes/*` — `learningOutcome.icon` is constrained to the `Icon` names, `level` is
  a lowercase enum (`beginner` | `intermediate` | `advanced`), durations are `durationSeconds`.
- Live dataset (queried directly): 10 courses, 4 modules / 12 lessons each, outcome icons in
  use are `layers`, `workflow`, `gauge`, `rocket`, `sparkles`, `shield`, `puzzle`, `code`.

## Decisions and assumptions

1. **Progress is a zero state.** No progress document type or write route exists yet. The bottom
   bar is built exactly as designed but driven by a `progress` prop; the page passes `null` today,
   which renders `0% complete` and a `Start Learning` CTA pointing at the first lesson. Nothing is
   fabricated, and wiring real progress later is a one-line change. (User decision.)
2. **The mockup's numbers are not the data.** The reference says "12 modules · 18h 24m · 2.1k
   students"; the page renders whatever the course actually has (4 modules, ~2h 27m for the seeded
   courses). Layout matches, values come from Sanity.
3. **Body copy stays Inter.** The course mockup renders body text in a serif; the home reference
   and the shipped design system use Playfair for display headings and Inter for body. Following
   the mockup here would make the two pages disagree, so headings (course title, "What you'll
   learn", "Course Content", outcome titles, module titles) are `font-display` and body stays sans.
4. **Lesson links go to `/lessons/<slug>`.** The lesson page does not exist yet, so these 404 for
   now, as `/courses` did after the home page.
5. **The accordion's expanded state is not in the reference.** The chevron implies expansion, so
   an open module lists its lessons as rows: derived label ("Lesson 2.3"), title, free-preview
   badge where set, duration, linking to the lesson. Styled from existing tokens only, nothing
   invented beyond the row.
6. **The "Show all N modules" toggle appears only when a course has more than six modules.** The
   seeded courses have four, so it is normally absent; it is still built, because the reference
   shows it and content decides.
7. **Bookmark is presentational**, like the notifications bell (AGENTS section 7).
8. **`Icon` gains a `users` glyph.** The meta row's student count uses the two-figure mark in the
   reference; the set only has single `user`. Additive; it adds one cell to `/design-system`'s
   icon grid, which is intended.

## Values recovered from the reference

The mockup is 1024x1536 with a hatched canvas margin outside the frame. Content column is
x 65..948 (~883 wide), which the existing header container (`max-w-[936px]`, `px-6`) already
matches. Measurements in reference pixels, taken by sampling the PNG.

| Thing | Value |
|---|---|
| Header hairline | y 86 (existing `SiteHeader`) |
| Breadcrumbs | baseline y ~131, "All Courses" > "Next.js for Production" |
| Hero glyph tile | x 65..345, y 176..502 — 280 x 326, radius ~16 |
| Hero text column | starts x 404 (gap ~59), badge y 176..201 |
| Course title | Playfair ~44px, single line, ink y 230..280 |
| Summary | 3 lines, ~16px, line height ~31, Neutral 700, max width ~400 |
| Meta row | y ~429, four items, 24px gaps, 18px icons, Neutral 500 |
| CTA row | y 470..523 (53 tall), primary 204 wide, secondary beside it, gap ~18 |
| "What you'll learn" card | x 65..948, y 565..961, radius 16, 1px border, padding 28 |
| Outcome tiles | 2 x 2, each ~403 wide, gap ~25, 1px border, radius 12, padding ~24 |
| Outcome icon | ~34px, Primary 500, outline |
| "Course Content" heading | Playfair ~24px, y ~1007; right side "N modules · Xh Ym" |
| Module card | y 1040..1416, radius 16, 1px border; rows ~60 tall with hairline separators |
| Module row | numbered circle (~34px, 1px border) on a vertical timeline rule, title + summary, duration right, chevron |
| "Show all" toggle | centered, straddling the card's bottom edge at y ~1400..1445 |
| Progress bar card | y 1451..bottom, radius 16, label + `ProgressBar` + primary CTA on the right |
| Accent bars | the home page's `AccentBars`, bleeding behind the bottom band |

Colors, radii, shadows and type all come from the existing `@theme` tokens; no new token.

## Files I expect to touch

| File | Change |
|---|---|
| `app/courses/[slug]/page.tsx` | **new** — server component, fetch + compose, `generateStaticParams`, `generateMetadata` |
| `components/course/course-hero.tsx` | **new** — glyph tile, badge, title, summary, meta row, CTAs |
| `components/course/learning-outcomes.tsx` | **new** — the "What you'll learn" card and tile grid |
| `components/course/course-curriculum.tsx` | **new**, `"use client"` — module list, accordions, show-all toggle |
| `components/course/course-progress.tsx` | **new** — the bottom progress band (accepts `progress: null`) |
| `components/course/index.ts` | **new** — barrel, matching `components/site/index.ts` |
| `components/ui/icon.tsx` | add the `users` glyph |
| `lib/format.ts` | **new** — `formatDuration` (18h 24m / 1h 12m / 45m), `formatLevel`, `formatCount` (2.1k), `formatStudents`, `lessonLabel` |
| `sanity.types.ts` | regenerated (`npm run typegen`) — it currently predates the queries, so no `*_QUERYResult` types exist yet |

No query, schema, or seed changes.

## Requirements

1. `app/courses/[slug]/page.tsx` is a server component. It reads the course with `sanityFetch`
   and `COURSE_BY_SLUG_QUERY`, calls `notFound()` when the slug misses, and exports
   `generateStaticParams` from `COURSE_SLUGS_QUERY` and `generateMetadata` (title + summary).
2. Every value on the page comes from the query result. Module numbers (`1..n`), lesson labels
   (`Lesson 2.3`), module durations (sum of its lessons) and course totals are derived, never
   stored — matching AGENTS section 7.
3. Formatting helpers are pure and unit-obvious: seconds in, display string out.
4. `POPULAR` renders only when `popular` is true. Level renders capitalized from the enum.
5. The outcome grid renders `learningOutcomes[]` with its `icon` mapped onto `Icon`; the section
   is omitted when the array is empty.
6. The curriculum client component owns only interaction state (which modules are open, whether
   all modules are shown). All content is passed in as props from the server component.
7. Accordion controls are real buttons with `aria-expanded` and `aria-controls`; the panel has a
   matching id. The toggle button reports the count.
8. Responsive: hero stacks under ~768px with the glyph tile capped so it does not dominate;
   outcomes collapse to one column; module rows keep the number, title and duration readable with
   the summary wrapping; the bottom band stacks its label, bar and CTA. No horizontal scroll at
   320, 375, 768, 1440.
9. Reuse `SiteHeader`, `Breadcrumbs`, `Badge`, `buttonClassName`, `Card`, `ProgressBar`,
   `CourseGlyph`, `AccentBars`, `Icon`, `cn`. Add no new primitive.
10. `/design-system` keeps rendering, with the single expected addition of the `users` icon.

## Security considerations

- The page is read only; the Sanity read token stays server side inside `sanityFetch`.
- The one client component receives plain serializable props and imports nothing from
  `sanity/lib/*`, so no token or client can be pulled into the browser bundle.
- No user input reaches a query: the slug is a route param used as a GROQ parameter, never
  interpolated into the query string.
- Links are internal `next/link` routes only; no external host is contacted at runtime.

## Acceptance criteria

1. `/courses/nextjs-app-router-in-depth` renders all five bands and matches the reference band by
   band at desktop: spacing, type, color, radii, borders.
2. Values are the seeded ones (4 modules, real durations, real student count), not the mockup's.
3. Module numbering, lesson labels and per-module durations are correct and derived.
4. Expanding a module reveals its lessons; collapsing hides them; keyboard works.
5. An unknown slug 404s.
6. The bottom band shows `0% complete` and `Start Learning` pointing at the first lesson.
7. No horizontal scroll at 320, 375, 768, 1440.
8. `npx tsc --noEmit` passes.
9. `npm run lint` passes.
10. `npm run build` succeeds (a route was added).

## Checks to run

From the repo root (web workspace):

- `npm --prefix studio run typegen` — regenerate `sanity.types.ts`.
- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`
- `npm run dev` — render the page.

No Studio deploy or content import: no schema, seed, or config document changes.

## Manual test steps

1. `npm run dev` from `/home/josh/mercurius-vertex`.
2. Open `http://localhost:3000/courses/nextjs-app-router-in-depth` beside
   `design/vertex-course.png` and compare band by band.
3. Confirm the hero glyph, POPULAR badge, title, summary and meta row all reflect Sanity, and that
   a non-popular course (`/courses/postgresql-for-developers`) hides the badge.
4. Expand and collapse a module; confirm the lessons listed belong to that module and are labelled
   `Lesson <module>.<n>`.
5. Tab through breadcrumbs, both CTAs, every accordion header and the bottom CTA; confirm a
   visible focus ring and that Enter/Space toggles an accordion.
6. Open `http://localhost:3000/courses/does-not-exist` and confirm a 404.
7. Resize to 1440, 768, 375 and 320 and confirm no horizontal scroll.
8. Open `http://localhost:3000/design-system` and confirm it is unchanged apart from the new
   `users` icon.
9. Click a lesson and confirm it navigates to `/lessons/<slug>` (404 until that route exists).

## Deviations from the plan (recorded during implementation)

- **`sanity/lib/client.ts` now carries the read token** (not in the original file list). `defineLive`
  only attaches its `serverToken` when the perspective is a draft one — see
  `next-sanity/dist/live/conditions/react-server/index.js`, where `token` is set only if
  `(perspective && perspective !== 'published') || stega`. Against this private dataset a published
  read therefore went out unauthenticated and came back empty (`count(*[_type == "course"])` → `0`,
  no error), so every page 404'd. Putting the token on the client fixes it and stays server side:
  `SanityLive` forwards only `browserToken` (unset), and `client.ts` now imports the `server-only`
  `token.ts`, so a client-component import is a build error.
- **`components/site/course-glyph.tsx`: the two letterform tiles are now SVG text.** At 280px the
  fixed 36px "N" was a speck. `Letterform` draws the letter in a 24-unit viewBox, so the same mark
  reads correctly on the 72px course card and the hero tile. Card rendering is unchanged.
- **`components/ui/button.tsx` gained a `cta` size** (52px tall, 24px padding, 16px gap) for the
  hero and progress-band actions, which the reference draws at 53px — between `lg` (44) and
  `hero` (60). Additive; existing usages are untouched.
- `sanity.types.ts` needed no change: it was already current (the query result types are named
  `*_QUERY_RESULT`).
- `/courses/[slug]` builds as a dynamic route rather than SSG. `sanityFetch` reads `draftMode()`,
  which opts the route out of full static generation; `generateStaticParams` still prerenders the
  ten courses and is kept for when that changes.
- The reference's outcome icons include a database and a cloud mark, which the schema's icon list
  does not offer. The seeded outcomes use icons that do exist, so nothing was added.
