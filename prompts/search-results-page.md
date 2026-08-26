# Implementation prompt: the search results page UI

## Goal

Rebuild `/search` so it matches `design/vertex-search.png` exactly, still wired to the
existing Sanity-backed search route. The search *engine* already works (AGENTS.md §11,
`prompts/intelligent-search.md`); this change is the **result page UI** plus the small
data additions the design's cards need.

Out of scope: the search route's model call, the Context document, ingestion, progress
tracking, My Learning, and anything on other pages.

## What I read

- `AGENTS.md` — §3 (reproduce the reference exactly, responsive down to mobile, reuse
  existing components), §5 (server/client boundaries; the browser never touches the MCP,
  the LLM or a token), §7 (grounded results, timestamps, playback stays on site,
  presentational-only surfaces), §11 (full results page, count, sort control, two result
  kinds and the fields each carries, empty state pointing at the catalog), §13 (checks).
- `design/vertex-search.png` — the source of truth for every visual decision below.

## Code and config I inspected

- `app/search/page.tsx` — current shell: `SiteHeader`, an `h1` "Search", a form posting to
  `/search`, and `<SearchResults key={query} query={query} />`.
- `components/search/search-results.tsx` — client component; POSTs `/api/search`, local
  sort, PostHog `search_performed`, renders `LessonVideoCard` / `LessonCard` in a 2-up grid.
- `app/api/search/route.ts` — hydrates the agent's lesson ids from Sanity and builds every
  card fact server side. Builds one combined `lessonLabel` string: "Lesson 5.1 in <module>".
- `lib/search/types.ts` — `SearchResult` union (`lesson` | `video`), `SearchResponse`.
- `sanity/lib/queries.ts` — `SEARCH_LESSONS_BY_IDS_QUERY` already returns title, slug,
  durationSeconds, keyPoints, poster, and the owning course (title, slug, glyph, modules).
- `components/ui/{card,badge,input,button,icon}.tsx` — `LessonVideoCard` / `LessonCard` are
  the compact vertical cards used elsewhere; `SearchInput` (md + hero), `Select`, `Badge`
  (`video` = orange, `lesson` = indigo), `buttonClassName`, `Icon` name list.
- `components/site/course-glyph.tsx` — `CourseGlyph`, sized by its container; the design
  shows it at ~24px beside the course name.
- `components/course/course-progress.tsx` — the precedent for "no backend yet": render the
  zero state rather than inventing data.
- `app/globals.css` — the palette, type scale, radii and shadows all exist as tokens.
- `lib/format.ts` (`formatDuration`, `pluralize`), `lib/video.ts` (`formatTimestamp`).

## Decisions and assumptions

- **New card components, not restyled shared ones.** The design's search rows are a
  distinct horizontal layout (media panel + body + footer action). `LessonVideoCard` /
  `LessonCard` stay as they are — they are used on other pages — and the search rows live
  in `components/search/` as `SearchResultCard`.
- **The label splits in two.** The design shows `Lesson 5.1` (file icon) and the module
  title (folder icon) as two separate meta items, so the route now returns
  `lessonNumber: string | null` and `moduleTitle: string | null` instead of one prose
  `lessonLabel`. Positions stay derived from array order, never stored.
- **Thumbnail time badge = clip length** (`formatDuration` of the lesson runtime), per
  AGENTS.md §11. In the reference the badge and the "Watch from" time happen to coincide,
  so this reads identically against the design.
- **The completion check circle on lesson rows is omitted.** Progress has no backend yet
  (no progress document, no write route), same as `CourseProgress`. Noted for the user.
- **Header count line and the in-list count both come from the response** — `Found 28
  results across 8 courses` and `28 results`. Never invented.
- **Sort control** keeps the existing local sorting (relevance / shortest / longest /
  title), relabelled `Most Relevant` etc. to match the design's default label. Sorting
  reorders the response in place and never re-runs the search.
- **The bottom band** ("Can't find what you're looking for?" + `Browse all courses`) shows
  under any non-empty result list *and* stands in as the empty state, which is what §11's
  "point to the full catalog" asks for.
- **The agent's `reply`** is not in the design, so it is no longer rendered. The field
  stays in the contract; the page just doesn't show conversational prose (§11: not a chatbox).
- **Loading state** reuses the page chrome with skeleton rows so the layout does not jump.
- **Responsive**: below `md` the row stacks — media panel full width above the body, the
  footer meta wraps, the header type scales down. Desktop is pixel-exact.

## Files I expect to touch

- `app/search/page.tsx` — rewritten shell: eyebrow, display heading with the quoted query,
  the count line (rendered by the client component, which owns the data), centered search
  form, results.
- `components/search/search-results.tsx` — new layout: header count + sort row, single
  column of rows, bottom CTA band, loading skeleton, empty state.
- `components/search/search-result-card.tsx` — **new**: the video row and the lesson row.
- `components/search/search-header.tsx` — **new**: eyebrow + heading + count + search field
  (client, so the count reacts to the response).
- `components/search/index.ts` — exports.
- `lib/search/types.ts` — `lessonNumber` / `moduleTitle` replace `lessonLabel`.
- `app/api/search/route.ts` — build those two fields.
- `components/ui/icon.tsx` — only if the design needs an icon that does not exist yet.

## Requirements

1. Page header, in order: `SEARCH RESULTS` eyebrow pill; `Results for "<query>"` in the
   display face with the quoted query in primary-500; `Found N results across M courses`;
   the search field (md size, ⌘K hint) at ~730px centered.
2. Result row: media panel left (~276×150, radius 12); body right with course glyph +
   course title, `VIDEO` / `LESSON` badge pinned top-right, lesson title, description,
   and a footer row of meta on the left and the action on the right.
3. Video row: poster thumbnail with a play circle and the clip-length badge bottom-right;
   meta `Lesson 5.1 · <module>`; action `Watch from 12:45 ›` linking to
   `/lessons/<slug>?t=<startSeconds>`.
4. Lesson row: left panel lists the lesson's key points as bullets on a tinted ground;
   meta `Module 5`; action `View lesson ›` linking to `/lessons/<slug>`.
5. Whole row is one link target; focus ring visible; badge and action are not separate
   tab stops.
6. Count, sort control and ordering behave as §11 requires; nothing is capped.
7. Empty state and the bottom band both link to `/courses`.
8. No new data reaches the browser beyond the existing `SearchResponse` shape.

## Security considerations

- The page and cards stay purely presentational. The MCP URL, the read token and the model
  call remain inside `app/api/search/route.ts` and `lib/search/mcp.ts` (`server-only`).
- The query string is rendered as text in the heading (React escapes it) and is length
  capped at `MAX_QUERY_LENGTH` before it reaches the route.
- Lesson and course slugs are URL-encoded into hrefs; `startSeconds` stays a clamped number.
- PostHog keeps capturing counts only — the query text is never sent.

## Acceptance criteria

- `/search?q=data+fetching` renders the design: eyebrow, heading, count, field, count+sort
  row, rows, bottom band.
- Video rows deep-link to the lesson page at the matched second and the embed starts there.
- Lesson rows open the lesson page.
- Zero results shows the catalog pointer; a failed request shows a retry.
- Every card fact traces to Sanity; nothing is model-authored except the one-line description.
- Responsive from 360px up with no horizontal scroll.

## Checks to run

- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`
- `npm run dev`, then the manual steps below.

## Manual test steps

1. `npm run dev`, open `http://localhost:3000`.
2. Search `data fetching` from the home hero — lands on `/search?q=data%20fetching`.
3. Confirm the header block matches `design/vertex-search.png`.
4. Confirm the count line and the `N results` line agree.
5. Change the sort to `Shortest first` — rows reorder, no network request fires.
6. Click a video row's `Watch from` — the lesson page opens with the player at that second.
7. Click a lesson row — the lesson page opens at 0:00.
8. Search a nonsense string — empty state with `Browse all courses`.
9. Narrow the window to 375px — rows stack, nothing overflows.
