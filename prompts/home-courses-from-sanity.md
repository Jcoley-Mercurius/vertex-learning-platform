# Implementation prompt: Home page courses from Sanity

## Goal

Replace the hardcoded placeholder array in `app/page.tsx` with the seeded Sanity catalog, so the
three cards under "All Courses" on the home page are real courses. Nothing else on the page
changes: the hero, the search field, the footer strip and the bar graphic stay exactly as they are.

## What I read

- `AGENTS.md` — section 3 (reuse existing components, reference is the source of truth), section 5
  (pages are read only, the Sanity client is server only), section 7 (counts and runtimes are
  derived, never stored), section 13 (checks).
- `prompts/home-page.md` — the page this change edits, including its recorded deviations.
- `prompts/course-page.md` — the course page just shipped, whose fetch and formatting patterns
  this reuses.

## Code I inspected

- `app/page.tsx` — currently a `courses` literal with pre-formatted display strings (`"18h 24m"`,
  `"12 modules"`, `"Intermediate"`), rendered into `CourseCard` with `orientation="stacked"`.
  Its own comment marks it as the seam a GROQ query replaces.
- `sanity/lib/queries.ts` — `COURSES_CATALOG_QUERY` already returns exactly the card fields
  (`title`, `slug`, `summary`, `glyph`, `level`, `moduleCount`, `durationSeconds`), ordered
  popular-first then alphabetical. **No query change.**
- `sanity/lib/live.ts` / `client.ts` — `sanityFetch` reads the private dataset with the server
  token; proven working by the course page.
- `lib/format.ts` — `formatDuration`, `formatLevel`, `pluralize` already produce the exact display
  strings the placeholders hardcoded.
- `components/ui/card.tsx` — `CourseCard` props unchanged.

## Decisions and assumptions

1. **The home page shows the first three courses of the catalog**, in the query's existing order
   (popular first, then alphabetical). "View all courses" keeps pointing at `/courses` for the
   rest. The reference shows exactly three cards, so the page slices rather than growing a grid.
2. **The seeded titles are the real ones.** The mockup's "Next.js for Production" becomes
   "Next.js App Router in Depth" and so on, as on the course page. Layout is unchanged.
3. **`app/page.tsx` becomes an async server component.** It stays read only; no client component
   is added, and nothing new reaches the browser.
4. **A course with no glyph falls back to `nextjs`**, matching the course page's handling.
5. **If the catalog comes back empty the section renders nothing** rather than an invented card.

## Files I expect to touch

| File | Change |
|---|---|
| `app/page.tsx` | drop the placeholder array; fetch `COURSES_CATALOG_QUERY`, format with `lib/format.ts`, render the first three |

No new components, no query, schema, or seed changes.

## Requirements

1. Every card value comes from Sanity: title, summary, level, total runtime, module count, glyph,
   and the `/courses/<slug>` link.
2. Durations and counts are formatted with the shared helpers, so the home page and the course
   page read identically.
3. The section's markup, classes and grid stay byte-for-byte what they are today apart from the
   data source.
4. The read token stays server side; no client component is introduced.

## Security considerations

- Read only, server side; the token never reaches the browser.
- No user input is involved in the query, and links are internal `next/link` routes.

## Acceptance criteria

1. `/` shows three seeded courses with real titles, summaries, levels, runtimes and module counts.
2. Each card links to a `/courses/<slug>` page that renders (no 404).
3. The rest of the home page is visually unchanged against `design/vertex-home.png`.
4. `npx tsc --noEmit`, `npm run lint` and `npm run build` all pass.

## Checks to run

- `npx tsc --noEmit`
- `npm run lint`
- `npm run build` (a route's data fetching changed)
- `npm run dev` and compare the page against the reference

## Manual test steps

1. `npm run dev`, open `http://localhost:3000/`.
2. Confirm the three cards show seeded courses and that the meta rows match what the course page
   shows for the same course.
3. Click each card and confirm the course page opens.
4. Confirm the hero, search field and footer band are unchanged.

## Deviations from the plan (recorded during implementation)

- Both this page's fetch and the course page's now pass `perspective: "published", stega: false`.
  Without them `sanityFetch` brands every string as `StegaString<…>`, which does not satisfy the
  literal unions the components take (`CourseGlyphName`). Being explicit is also what these pages
  mean: read only, no draft previews. It let the `as CourseGlyphName` cast on the course page go.
- The "All Courses" section is skipped entirely when the catalog is empty, rather than rendering
  its heading over an empty grid.
