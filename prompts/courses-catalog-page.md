# Implementation prompt: All Courses catalog page

## Goal

Build `/courses` — the catalog every "View all courses" / "All Courses" link already points at.
Deliberately simple: the site header, a page heading with the course count, and the full catalog
rendered with the same card the home page uses. No filters, no sort, no pagination.

Read only, server rendered.

## What I read

- `AGENTS.md` — section 3 (no reference image exists for this page, so reuse the components and
  patterns already in the project rather than inventing a look), section 5 (pages are read only),
  section 13 (checks).
- `prompts/home-page.md`, `prompts/course-page.md`, `prompts/home-courses-from-sanity.md` — the
  patterns this page copies.

## Code I inspected

- `app/page.tsx` — the "All Courses" section: a heading row, then
  `grid gap-6 sm:grid-cols-2 lg:grid-cols-3` of stacked `CourseCard`s, fed by
  `COURSES_CATALOG_QUERY` and formatted with `lib/format.ts`. This page is that section, full size.
- `app/courses/[slug]/page.tsx` — the container (`max-w-[936px] px-6`), the `sanityFetch` call
  shape (`perspective: "published", stega: false`) and the breadcrumb usage.
- `sanity/lib/queries.ts` — `COURSES_CATALOG_QUERY` already returns the whole catalog ordered
  popular-first then alphabetical. **No query change.**

## Decisions and assumptions

1. **No new visual language.** There is no `design/vertex-courses.png`, so the page is assembled
   from what the home page and the course page already established: same container width as the
   course page, same card, same grid, same type scale.
2. **Whole catalog, one grid.** Ten courses today; pagination would be inventing a control nobody
   asked for. If the catalog grows past a screenful that is a later decision.
3. **A count line under the heading** ("10 courses"), matching how the course page states
   "N modules · Xh Ym" — it is the one piece of information the page adds.
4. **Empty state**: if the catalog returns nothing, say so in one line rather than showing an empty
   grid.
5. **No breadcrumbs.** The course page's breadcrumb already treats "All Courses" as the root of
   this section; a breadcrumb on the root itself would only repeat the heading.

## Files I expect to touch

| File | Change |
|---|---|
| `app/courses/page.tsx` | **new** — server component: fetch the catalog, heading + count, card grid |

No components, queries, schema or seed changes.

## Requirements

1. Every card value comes from Sanity and is formatted with `lib/format.ts`, so the cards read
   identically to the home page's.
2. Each card links to `/courses/<slug>`.
3. `generateMetadata`/`metadata` sets a page title.
4. Responsive: three columns at desktop, two at tablet, one at mobile — the home page's breakpoints.
   No horizontal scroll at 320, 375, 768, 1440.
5. The read token stays server side; no client component is added.

## Security considerations

- Read only, server side; no token reaches the browser, no user input reaches the query.

## Acceptance criteria

1. `/courses` lists all ten seeded courses with correct titles, summaries, levels, runtimes,
   module counts and glyphs.
2. The count line matches the number of cards.
3. Every card navigates to a course page that renders.
4. `npx tsc --noEmit`, `npm run lint` and `npm run build` pass.

## Checks to run

- `npx tsc --noEmit`
- `npm run lint`
- `npm run build` (a route was added)
- `npm run dev` and view the page

## Manual test steps

1. `npm run dev`, open `http://localhost:3000/courses`.
2. Confirm ten cards and a matching count.
3. Click a card and confirm the course page opens.
4. From the home page, click "View all courses" and confirm it lands here; from a course page,
   click the "All Courses" breadcrumb and confirm the same.
5. Resize to 1440, 768, 375 and 320 and confirm the grid reflows with no horizontal scroll.
