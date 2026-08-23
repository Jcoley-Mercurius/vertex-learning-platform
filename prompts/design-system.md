# Implementation prompt: Vertex Design System

## Goal

Implement the Vertex design system from `design/vertex-designsystem.png` as real,
reusable code: design tokens in Tailwind v4, a set of primitive UI components that
match the poster exactly, and a `/design-system` showcase page that renders every
section of the poster so it can be diffed against the reference.

This is the foundation layer only. No Sanity, Clerk, PostHog, search, or app pages.

## What I read

- `AGENTS.md` (project instructions) — sections 2 (workflow), 3 (UI work), 5 (structure),
  6 (stack), 13 (checks).
- `design/vertex-designsystem.png` — the reference, read in full plus zoomed crops of
  every numbered section to recover exact values.
- `node_modules/next/dist/docs/01-app/01-getting-started/13-fonts.md` — `next/font/google`
  usage in this Next version (16.3.2).
- `node_modules/next/dist/docs/01-app/01-getting-started/11-css.md` — Tailwind v4 wiring
  (`@import "tailwindcss"`, `@tailwindcss/postcss`), which the project already has.

No project skill applies to this task: the listed skills cover Sanity, Clerk, and the
search agent, none of which this touches.

## Code I inspected

- `package.json` — Next 16.3.2, React 19.2.8, Tailwind v4, TypeScript. No UI or icon deps.
- `app/layout.tsx` — Create Next App default: Geist + Geist Mono, placeholder metadata.
- `app/globals.css` — CNA default: `@theme inline` with background/foreground only, plus a
  `prefers-color-scheme: dark` block, and `font-family: Arial` hardcoded on `body`.
- `app/page.tsx` — CNA placeholder page.
- `tsconfig.json` — `@/*` path alias maps to the repo root.
- `postcss.config.mjs`, `next.config.ts`, `eslint.config.mjs` — defaults, no changes needed.

## Values recovered from the reference

The PNG's own pixels carry a warm color cast (pure white reads `#FCF8F7`), so the printed
hex labels are the source of truth, not sampled pixels. I zoomed each label to read it.

**01 Colors**

| Token | Hex | | Token | Hex |
|---|---|---|---|---|
| Primary 500 | `#F97316` | | Neutral 900 | `#0F172A` |
| Primary 400 | `#FB923C` | | Neutral 700 | `#334155` |
| Primary 300 | `#FDBA74` | | Neutral 500 | `#64748B` |
| Primary 200 | `#FED7AA` | | Neutral 300 | `#CBD5E1` |
| Primary 100 | `#FFEEE5` | | Neutral 200 | `#E2E8F0` |
| | | | Neutral 100 | `#F1F5F9` |
| | | | Neutral 50 | `#FAFAFC` |
| | | | White | `#FFFFFF` |

**02/03 Typography** — Playfair Display (display) and Inter (body).

| Style | Font | Size / Line height | Weight |
|---|---|---|---|
| Display 1 | Playfair Display | 48 / 56 | Bold (700) |
| Display 2 | Playfair Display | 36 / 44 | Bold (700) |
| Heading 1 | Inter | 28 / 36 | Semi Bold (600) |
| Heading 2 | Inter | 22 / 30 | Semi Bold (600) |
| Heading 3 | Inter | 18 / 26 | Medium (500) |
| Body Large | Inter | 16 / 24 | Regular (400) |
| Body | Inter | 14 / 20 | Regular (400) |
| Small | Inter | 12 / 16 | Regular (400) |

**04 Spacing** — base unit 4px; scale 4, 8, 12, 16, 24, 32, 40, 48, 64.

**05 Radius** — xs 4px, sm 8px, md 12px, lg 16px, xl 24px, full (circle).

**05 Shadows**

- sm: `0 1px 2px 0 rgba(15, 23, 42, 0.05)`
- md: `0 4px 12px -2px rgba(15, 23, 42, 0.08)`
- lg: `0 12px 24px -4px rgba(15, 23, 42, 0.10)`
- xl: `0 20px 40px -8px rgba(15, 23, 42, 0.12)`

**06 Icons** — 24x24 grid, 2px stroke (outline), rounded line caps, consistent optical
balance. Outline and filled styles for: bell, search, play-circle, file-text, bookmark,
bar-chart, clock, user, chevron-right.

**07 Buttons** — height 44px default, padding `0 16px` (lg) / `0 12px` (md), radius 12px,
Inter Medium 14–16px. Four variants x three states:

- Primary: solid Primary 500, hover darker, disabled Primary 100 bg with faded label.
- Secondary: white bg, 1px Primary border, Primary 500 label; hover tinted bg; disabled faded.
- Tertiary: white bg, 1px Neutral 200 border, Neutral 900 label + external-link icon;
  hover light neutral bg; disabled faded.
- Text: no bg or border, Primary 500 label + circled play icon; disabled faded.

**08 Inputs** — height 44px, radius 12px, border `1px solid #E2E8F0`, padding `0 16px`,
focus border `#FB923C`. Search input has a leading search icon and a trailing `⌘K` key hint.
Select has a trailing chevron-down.

**09 Badges** — pill, uppercase, small bold: `VIDEO` (orange on Primary 100),
`LESSON` (indigo on light indigo), `POPULAR` (orange on Primary 100).

**10 Status** — In Progress (orange partial ring), Completed (green check circle),
Now Playing (filled orange play circle), Locked (neutral outline padlock).

**11 Progress bar** — full-width rounded track in Neutral 100, Primary 500 fill,
trailing `35% complete` label with the percentage in bold Neutral 900.

**12 Cards** — white, radius 16px, 1px Neutral 200 border, shadow sm:

- Course card: square dark icon tile, title, description, meta row (level, duration, modules).
- Lesson card (video): VIDEO badge, title, description, footer `Lesson 5.1 · 12:45` and a
  `Watch from 12:45` text action.
- Lesson card (lesson): LESSON badge, title, description, footer `Module 5` and a
  `View lesson` action with external-link icon.
- Resource card: file icon, title, description, footer `PDF · 1.2 MB` and an external-link action.

**13 Navigation** — logo lockup (orange triangle mark + "Vertex" wordmark), nav links with
the active link in Primary 500; breadcrumbs separated by chevron-right with the trailing
crumb in Neutral 500; pagination with prev/next chevrons, numbered pages, an ellipsis, and
the current page boxed in a Primary border.

**14 Principles** — four items (Clarity First, Consistency, Focus & Calm, Accessible), each
an icon plus title plus two-line description.

## Decisions and assumptions

1. **Build in place at the repo root.** `AGENTS.md` section 5 calls for separate `studio` and
   `web` workspaces, but the repo currently has the Next app at the root and no Studio.
   Restructuring the repo is not part of this request, so I build here and leave the split
   for whoever adds the Studio. Flagged in the report.
2. **Light mode only.** The reference shows a single light theme. Per section 3 I reproduce
   it exactly and do not invent a dark palette, so I remove the CNA
   `prefers-color-scheme: dark` block rather than guess at dark values.
3. **Fonts via `next/font/google`.** Playfair Display and Inter replace Geist/Geist Mono,
   exposed as `--font-display` and `--font-sans` CSS variables. Geist is removed because
   nothing in the design uses it.
4. **Hand-rolled icon set, no new dependency.** The design needs about fifteen glyphs in two
   styles. A hand-rolled `Icon` component on a 24x24 grid with 2px round-capped strokes hits
   the stated spec exactly and adds nothing to the bundle. (Alternative considered:
   `lucide-react`, which matches the outline spec but has no filled variants and pulls in a
   whole library for fifteen glyphs.)
5. **Two colors fall outside the documented palette.** The `LESSON` badge indigo and the
   `Completed` green are not in the section 01 swatches. The palette is otherwise exactly
   Tailwind's orange and slate scales, so I use Tailwind-consistent values —
   indigo `#E0E7FF` bg / `#4F46E5` text, and green `#22C55E` — added as named tokens
   (`--color-accent-indigo*`, `--color-success`) so they are easy to correct. Flagged.
6. **Tokens live in `app/globals.css` under Tailwind v4 `@theme`,** which is the v4 way to
   register design tokens and get utilities generated. No `tailwind.config.ts` is added.
7. **Components are server components by default.** Nothing here needs interactivity, so no
   `"use client"` is added. Hover states are CSS. The showcase renders the disabled state via
   props and the hover state via a static class so all three rows are visible at once, as in
   the poster.
8. **The showcase lives at `/design-system`,** not at `/`. The CNA home page stays untouched
   so this change does not collide with whoever builds the real catalog home.
9. **Responsive down to mobile** per section 3: the showcase grid collapses to one column,
   card rows stack, and the spacing/palette strips scroll or wrap rather than overflow.

## Files I expect to touch

Create:

- `components/ui/icon.tsx` — the icon set (outline + filled), 24x24, 2px, round caps.
- `components/ui/logo.tsx` — Vertex mark and wordmark lockup.
- `components/ui/button.tsx` — `Button` with `variant` (primary | secondary | tertiary | text),
  `size` (md | lg), `disabled`.
- `components/ui/input.tsx` — `SearchInput` and `Select`.
- `components/ui/badge.tsx` — `Badge` with `tone` (video | lesson | popular).
- `components/ui/status.tsx` — `StatusIndicator` with `status`
  (in-progress | completed | now-playing | locked).
- `components/ui/progress-bar.tsx` — `ProgressBar` with `value`.
- `components/ui/card.tsx` — `Card` shell plus `CourseCard`, `LessonVideoCard`,
  `LessonCard`, `ResourceCard`.
- `components/ui/navigation.tsx` — `Navbar`, `Breadcrumbs`, `Pagination`.
- `components/ui/index.ts` — barrel export.
- `app/design-system/page.tsx` — the showcase page, one section per poster section.

Modify:

- `app/globals.css` — replace the CNA tokens with the full Vertex token set under `@theme`.
- `app/layout.tsx` — swap Geist for Playfair Display + Inter, set Vertex metadata, apply the
  page background and base body type.

Not touched: `app/page.tsx`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`,
`tsconfig.json`, `package.json` (no new dependencies).

## Requirements

- Every value above appears once, as a token in `@theme`, and components reference the token
  rather than a literal hex, px, or shadow string.
- Component APIs are typed, extend the matching native element props, and forward `className`
  so callers can compose without re-declaring styles.
- Class composition uses a tiny local helper (join + filter), not a new `clsx`/`cva` dependency.
- The showcase page reproduces the poster's section order and numbering (01–14) and labels each
  swatch, token, and component the way the poster does.
- Semantic HTML throughout: `button` for buttons, `nav` + `ol` for breadcrumbs and pagination,
  `label` tied to inputs, `progressbar` role with `aria-valuenow`, `aria-current="page"` on the
  active pagination item, icons `aria-hidden` when decorative.
- Focus states are visible on every interactive element (input focus border `#FB923C`, and a
  visible focus ring on buttons and links) — principle 14 says accessible.
- Disabled buttons carry the `disabled` attribute, not just faded styling.
- No dark-mode classes anywhere.

## Security considerations

Small for this change, but the ones that apply:

- No secrets, tokens, env vars, or network calls are introduced; this is presentational only.
- No new dependencies, so no new supply-chain surface.
- No `dangerouslySetInnerHTML` anywhere; all icon SVG is authored as JSX.
- All component content arrives through typed props and is rendered as text, so it is escaped
  by React. Nothing here renders untrusted HTML or markdown.
- `next/font/google` self-hosts both fonts at build time, so no runtime request leaves the
  user's browser to a third-party font host.

## Acceptance criteria

1. `/design-system` renders all fourteen sections and visually matches the reference at
   desktop width: same colors, type scale, radii, shadows, spacing, and component states.
2. Every color, radius, shadow, and font token from the poster is defined in `@theme` and used
   by at least one component.
3. All four button variants render in default, hover, and disabled states.
4. All four card types render with the exact copy shown in the poster.
5. The page is usable at 375px wide with no horizontal scroll on the page body.
6. Keyboard tabbing through the page shows a visible focus indicator on every control.
7. `npx tsc --noEmit` passes.
8. `npm run lint` passes.
9. `npm run build` succeeds.

## Checks to run

Per `AGENTS.md` section 13, from the repo root (the web workspace):

- `npx tsc --noEmit`
- `npm run lint`
- `npm run build` — routes and config changed, so a production build is required.
- `npm run dev` — confirm the page renders.

No Studio checks apply; this change touches no Sanity schema or content.

## Manual test steps

1. `npm run dev` from `/home/josh/mercurius-vertex`.
2. Open `http://localhost:3000/design-system`.
3. Put the page side by side with `design/vertex-designsystem.png` and walk sections 01–14.
   Confirm the palette hexes, the eight type-scale rows, the nine spacing steps, the six radii,
   the four shadows, the two icon rows, the twelve button cells, both inputs, the three badges,
   the four status indicators, the progress bar at 35%, the four cards, and the nav row.
4. Click into the search input and confirm the border turns `#FB923C` on focus.
5. Tab through the whole page and confirm every button, link, and field shows a focus ring.
6. Confirm the disabled buttons cannot be focused or clicked.
7. Resize the window to 375px wide and confirm the layout stacks with no horizontal scrollbar
   on the page body.
8. Open `http://localhost:3000/` and confirm the existing home page is unchanged.
