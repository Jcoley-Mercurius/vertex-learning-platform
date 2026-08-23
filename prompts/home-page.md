# Implementation prompt: Vertex home page

## Goal

Build the Vertex home page at `/` from `design/vertex-home.png`, reproducing the reference
exactly at desktop and adapting sensibly down to mobile. Four bands: site header, hero
(eyebrow badge, serif headline, lead paragraph, primary CTA, large search field), an
"All Courses" section with three course cards, and a decorative footer band (hairline +
star label over an orange bar graphic).

UI only. No Sanity, Clerk, PostHog, or search backend in this change.

## What I read

- `AGENTS.md` — sections 2 (workflow), 3 (UI work: reference is the source of truth, reuse
  existing components, responsive down to mobile), 5 (structure: pages are read only),
  13 (checks).
- `design/vertex-home.png` — read in full plus zoomed crops of the header, the CTA, the
  section header, a course card, the card meta row, and the footer band; then measured with
  pixel sampling (see "Values recovered").
- `prompts/design-system.md` — the token table and component specs already implemented.
- `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md` — page
  conventions in Next 16.3.2.

No project skill applies: the listed skills cover Sanity, Clerk, and the search agent, none
of which this change touches.

## Code I inspected

- `app/layout.tsx` — Inter + Playfair Display wired as `--font-inter` / `--font-playfair-display`,
  `body` is `min-h-full flex flex-col`, metadata already says "Vertex".
- `app/globals.css` — all design tokens in `@theme`; `body` background is `--color-neutral-50`.
- `app/page.tsx` — still the Create Next App placeholder. This change replaces it entirely.
- `components/ui/*` — `Logo`/`LogoMark`, `Icon` (24x24 grid, outline + filled), `Button`
  (4 variants, h-44), `Badge`, `SearchInput` (h-44, leading icon, trailing kbd), `Card`,
  `CourseCard` (icon tile beside title), `Navbar`, `cn`.
- `app/design-system/page.tsx` — the showcase that pins current component behaviour; it must
  keep rendering unchanged, so every component edit below is additive and defaults to today's
  output.

## Values recovered from the reference

The mockup is 1024x1536. A hatched canvas margin sits outside x 32..992, so the page frame is
960px wide. Measurements below are in reference pixels, taken by sampling the PNG.

**Layout**

| Thing | Value |
|---|---|
| Header container | x 68..961 (~896 wide), height 97, 1px bottom hairline |
| Content column | x 82..938 (856 wide), centered |
| Hero band | header border to y 742, then a 1px hairline |
| Eyebrow badge | 209 x 44, centered, pill-ish radius, 1px border |
| Headline | 2 lines, ink 242..378, line height 74, Playfair ~60px |
| Lead paragraph | 2 lines, line height 33, ~19px, Neutral 700 |
| CTA button | 225 x 59, radius 12, label + arrow, gap ~24 |
| Search field | 746 x ~88, radius 12, 1px border, ~18px placeholder, trailing kbd |
| Section header | "All Courses" Playfair ~30px; "View all courses →" primary, right aligned |
| Course cards | 3 up, each ~275 wide x 373 tall, gap ~18, radius 16, 1px border |
| Footer strip | full-bleed hairline at y 1304 broken by a centered star + label |
| Footer bars | two clusters (6 bars, then 7), ~56 wide, ~2 gap, staggered heights, fading from transparent at the top to a soft orange at the bottom, clipped by the page edge |

**Course card (differs from the design-system CourseCard)** — the glyph sits *above* the title,
the title is Playfair (not Inter), and a hairline separates the body from the meta row. Meta
row: filled bar-chart + level, clock + duration, page icon + module count, all Neutral 500 body.

**Colors** — the mockup carries a warm paper cast (white reads `#FDFCFA`, the page ground
`#FBF8F5`, the CTA `#E46D48`). As with the design-system poster, the tokens are the source of
truth, not sampled pixels: CTA and links are Primary 500, borders Neutral 200, card ground
white, page ground Neutral 50, headings Neutral 900, body Neutral 500/700.

**Copy** (verbatim from the reference)

- Eyebrow: `INTELLIGENT LEARNING`
- Headline: `Search your learning in plain English.` (breaks after "learning")
- Lead: `Vertex understands what you want to learn and finds the exact lessons across all your courses.`
- CTA: `Explore Courses`; search placeholder: `Ask anything about your learning...`; kbd: `⌘ K`
- Section: `All Courses` / `View all courses`
- Cards:
  1. `Next.js for Production` — `Build scalable, high-performance web applications with Next.js.` — Intermediate · 18h 24m · 12 modules
  2. `Docker Essentials` — `Containerize applications and streamline your development workflow.` — Beginner · 10h 12m · 8 modules
  3. `TypeScript Deep Dive` — `Go beyond the basics and write safer, more expressive code.` — Intermediate · 14h 36m · 10 modules
- Footer: `New courses and lessons added every week.`

## Decisions and assumptions

1. **Scale 1:1 with the reference** (confirmed with the user): content column `max-w-[856px]`,
   header container `max-w-[896px]`, both centered, with every measured size used as measured.
2. **Static placeholder data.** Sanity is not wired yet, so the three courses live in a typed
   `const` in `app/page.tsx` with a comment marking it as the seam a GROQ query replaces. The
   page stays a server component and reads nothing at runtime.
3. **Links point at their intended routes** (`/courses`, `/courses/<slug>`, `/my-learning`)
   even though those routes 404 until built. Wiring them now avoids a second pass.
4. **The search field is presentational** — no `use client`, no submit handler, no ⌘K listener.
   Section 7 of AGENTS.md puts search behind a server route that does not exist yet; the kbd
   hint is decorative, matching the reference.
5. **The avatar is a placeholder.** The reference shows a photo we do not have and Clerk is not
   installed. Render a circular Neutral 100 chip with the `user` icon, sized to the reference,
   so `<UserButton />` can drop into the same slot later.
6. **Course glyphs are inline SVG brand marks** (Next.js wordmark tile, Docker whale in
   `#2496ED`, TypeScript tile in `#3178C6`) in a small `CourseGlyph` component. No remote images,
   so no `next/image` remote host config and nothing leaves the browser.
7. **The footer bar graphic is decorative**: `aria-hidden`, built from divs with a
   transparent-to-`--color-primary-300` gradient and a slight blur, clipped by the section. It
   is an approximation of a blurred graphic, not a data chart, and carries no meaning.
8. **Component edits are additive.** `/design-system` must render identically after this change,
   so each new prop defaults to today's behaviour.

## Files I expect to touch

- `app/page.tsx` — replaced with the home page (server component) and its placeholder data.
- `components/ui/icon.tsx` — add three glyphs on the same 24x24 grid: `arrow-right`, `star`
  (outline, used at the footer), `file` (blank page with a folded corner, the module-count icon).
- `components/ui/input.tsx` — `SearchInput` gains `size?: "md" | "hero"` (default `"md"`).
  `hero` = 88px tall, 18px placeholder, 24px leading icon, larger trailing kbd.
- `components/ui/card.tsx` — `CourseCard` gains `orientation?: "inline" | "stacked"` (default
  `"inline"`, today's layout) and an optional `href`. `stacked` puts the glyph above a Playfair
  title and adds the hairline above the meta row; the module icon becomes `file`.
- `components/site/site-header.tsx` — new. Composes `Navbar` with the notification bell and the
  avatar slot, plus the bottom hairline.
- `components/site/course-glyph.tsx` — new. The three brand marks.
- `components/site/accent-bars.tsx` — new. The decorative footer band.
- `components/site/index.ts` — new barrel, mirroring `components/ui/index.ts`.
- `components/ui/index.ts` — export any new types added above.

Not touched: `app/layout.tsx`, `app/globals.css` (every value needed already has a token),
`app/design-system/page.tsx`, config files.

## Requirements

1. Desktop matches the reference: the four bands, in order, at the measured sizes, using the
   existing tokens.
2. Serif (`font-display`) for the headline, the section heading, and the stacked card titles;
   Inter everywhere else.
3. Responsive with no horizontal scroll from 320px up: header nav wraps and the bell/avatar stay
   on the top row, hero type steps down, the search field goes full width, the card grid drops
   to 2 columns then 1, and the footer bars stay clipped.
4. Semantics: one `<h1>` (the headline), `<h2>` for "All Courses", cards as `<article>` with an
   `<h3>`, the header in `<header>`, the bands in `<section>`, the bell as a real `<button>`
   with an accessible name, the bar graphic `aria-hidden`.
5. Every interactive element keeps the project's visible focus ring, and hover states follow the
   existing `Button`/link patterns.
6. The search input has an associated accessible label (visually hidden).
7. No new dependencies.

## Security considerations

- The page is a server component rendering static local data. No secrets, no tokens, no network
  calls, no user input handling, and nothing rendered as HTML — so no injection surface.
- All assets are inline SVG or self-hosted fonts; no third-party host is contacted at runtime.
- Nothing here writes content or progress, so the server/client boundary rule in AGENTS.md
  section 5 is trivially preserved.

## Acceptance criteria

1. `/` renders the four bands and matches `design/vertex-home.png` side by side at desktop:
   spacing, type, color, radii, borders, and the copy above.
2. The three course cards show the correct glyph, serif title, description, and meta row.
3. `/design-system` renders exactly as it does today.
4. No horizontal scroll at 320, 375, 768, and 1440px wide.
5. Tabbing reaches the nav links, the bell, the CTA, the search field, "View all courses", and
   each card, each with a visible focus ring.
6. `npx tsc --noEmit` passes.
7. `npm run lint` passes.
8. `npm run build` succeeds.

## Checks to run

From the repo root (the web workspace), per AGENTS.md section 13:

- `npx tsc --noEmit`
- `npm run lint`
- `npm run build` — a route changed, so a production build is required.
- `npm run dev` — confirm the page renders.

No Studio checks apply; no schema, content, or config document changes.

## Manual test steps

1. `npm run dev` from `/home/josh/mercurius-vertex`.
2. Open `http://localhost:3000/` next to `design/vertex-home.png` and compare band by band:
   header, hero, courses, footer strip and bars.
3. Confirm the headline breaks after "learning" and renders in Playfair Display.
4. Focus the search field and confirm the border turns Primary 400.
5. Tab through the page and confirm a visible focus ring on every control.
6. Resize to 1440, 768, 375, and 320px and confirm the layout adapts with no horizontal scroll.
7. Open `http://localhost:3000/design-system` and confirm it is unchanged.
8. Click `Explore Courses`, `View all courses`, and a card, and confirm they navigate to
   `/courses` and `/courses/<slug>` (404 until those routes exist).

## Deviations from the plan (recorded during implementation)

- `components/ui/button.tsx` also changed (not in the original file list): the CTA is a `<Link>`,
  so `Button` now shares its styling through an exported `buttonClassName()` helper and gained a
  `hero` size (60px tall, 28px padding, 24px gap). Heights and gaps moved from the base class
  into the size map so an override cannot collide. `Button` renders exactly as before.
- `Card` gained an `as` prop (`div` | `article`) so a standalone card is an `<article>`.
- Stacked card titles render at 21px/28 rather than Heading 2 (22px). Measured against the
  reference (title ink 194px wide inside a 210px content box), 22px Playfair wrapped to two
  lines where the reference holds one.
- The reference's header container is 936px wide (logo at x 68), not 896px as first measured.
- Follow-up from the user: the main content column is now `max-w-[1440px]` (header, hero, courses,
  footer strip, and bar band all share it, with 40px page padding). Typography and component sizes
  stay at the reference values; the hero keeps its reference measure (headline 720px, lead 460px)
  so both line breaks survive, the search field widens to 960px, the card grid gap goes to 24px,
  and stacked card padding/title return to 32px / Heading 2 now that the cards are wider.
