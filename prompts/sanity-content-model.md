# Implementation prompt: Sanity content model, standalone Studio, and the web read layer

## Goal

Two things, in one change:

1. **Content model + Studio.** Model Course, Module, Lesson, Instructor and Category in Sanity,
   in a **standalone `studio/` workspace** (AGENTS.md §5), replacing the embedded Studio scaffold
   currently sitting uncommitted at `app/studio/[[...tool]]/page.tsx`.
2. **Web read layer.** A server-only Sanity client with a read token, a `sanityFetch` helper,
   an image URL builder, a Portable Text renderer, and the typed GROQ queries the catalog,
   course, lesson and instructor pages will consume — plus TypeGen wiring so those queries
   are typed end to end.

Out of scope, deliberately: the `video`, `progress` and agent-context documents (sections 8–10
of AGENTS.md), the search route, PostHog, ingestion, and **any page rendering**. No page under
`app/` changes its output except `app/layout.tsx` (which gains `<SanityLive />`). `app/page.tsx`
keeps its hardcoded placeholder catalog; wiring it to Sanity is the next change.

## What I read

- `AGENTS.md` — §2 (workflow), §5 (two standalone workspaces; server/client boundaries;
  pages are read only), §6 (stack), §7 (decisions: structured content via Portable Text never
  markdown; modules embedded, derived numbering), §8 (the field-by-field data shape — the
  relationships and named fields there are fixed), §12 (private dataset, server-only token,
  committed `.env.example`), §13 (checks).
- `sanity-best-practices` skill — `SKILL.md` global rules, then `references/schema.md`,
  `references/project-structure.md`, `references/typegen.md`, `references/nextjs.md`,
  `references/groq.md`.
- `node_modules/next/dist/docs/` — confirmed this is Next **16.3.2** and that middleware is
  `proxy.ts` here. This change adds no routes, so the Next surface is limited to `app/layout.tsx`.

## Code and config I inspected

- `sanity.config.ts` / `sanity.cli.ts` / `sanity/env.ts` / `sanity/structure.ts` /
  `sanity/schemaTypes/index.ts` — the `sanity init` embedded scaffold. `schemaTypes.types` is `[]`;
  nothing is modeled yet.
- `sanity/lib/{client,image,live}.ts` — `client` has `useCdn: true` and **no token**;
  `defineLive` is called with **no `serverToken`**. Both fail against a private dataset.
- `app/studio/[[...tool]]/page.tsx` — `<NextStudio />`. Deleted by this change.
- `app/layout.tsx` — Inter + Playfair wired; no `<SanityLive />`.
- `app/page.tsx` — placeholder `courses` array with `slug/title/description/level/duration/modules/glyph`.
  That shape is the target the course model must be able to satisfy.
- `components/ui/icon.tsx` — `iconNames`: `bell search bookmark clock user star file lock folder
  eye grid target accessibility`. These are the only icons a learning outcome can name.
- `components/site/course-glyph.tsx` — `CourseGlyphName = "nextjs" | "docker" | "typescript"`.
  The only course glyphs that render today.
- `.env.local` — has Clerk keys + `NEXT_PUBLIC_SANITY_DATASET` / `NEXT_PUBLIC_SANITY_PROJECT_ID`.
  **No `SANITY_API_READ_TOKEN`.**
- `.gitignore` — ignores `.env*` with no negation, so `.env.example` cannot be committed as-is.
- `package.json` — `sanity@5.31.2`, `next-sanity@13.3.3`, `@sanity/vision@5.31.2`,
  `@sanity/image-url@2.1.1`. No `@portabletext/react`, no `@tailwindcss/typography`.

## Decisions and assumptions

- **Standalone Studio** (your call in the question panel). `studio/` gets its own `package.json`,
  so it can auto-update, build on Vite, and run TypeGen in watch mode.
- **Schema lives only in `studio/`.** The web app never imports schema types — it consumes the
  generated `sanity.types.ts`. This is what keeps the two workspaces genuinely independent.
- **`@sanity/icons` v3.8.0 exports only the package root.** Its `exports` map is `{".": …}`
  with no subpaths, so the skill's `@sanity/icons/DocumentText` form would fail at bundle time
  here. I will use root named imports (`import {BookIcon} from '@sanity/icons'`) and note it.
- **Durations are stored in seconds** (`durationSeconds`, integer) on the lesson. Seconds is what
  the video pipeline and the `?t=` start-second deep links need later; the "18h 24m" string is a
  display concern. A course's total duration and lesson count are **derived in GROQ**, never stored.
- **Module numbering is derived**, per AGENTS.md §7 — no `order`/`number` fields anywhere.
- **`popular` and `freePreview` stay booleans.** The schema skill prefers `options.list` over
  booleans for states that may expand, but AGENTS.md §8 names both as flags. AGENTS.md wins.
- **`level` is `options.list`** (beginner / intermediate / advanced) — a genuine enum.
- **Lesson notes and instructor bio are Portable Text**; everything else is typed fields.
  Markdown appears nowhere in the content model (AGENTS.md §7).
- **Course gains a `glyph` field** constrained to the three `CourseGlyphName` values. AGENTS.md §11
  requires a video result to carry "the course (name and icon)", and that icon has to come from
  somewhere. Constraining it to what `CourseGlyph` can render keeps the data honest.
- **Live Content API with a `serverToken` and no `browserToken`.** Published content updates live;
  no token ever reaches the browser. Draft mode / Presentation is not set up in this change.
- **TypeGen types are committed** (`sanity.types.ts` at the web root), so `tsc` and `next build`
  work from a clean checkout with no Studio install.
- **No seed content is created.** The Studio ships empty; authoring or importing content is separate.

## Files I expect to touch

**New — `studio/` workspace**

| File | Contents |
|---|---|
| `studio/package.json` | `sanity`, `@sanity/vision`, `@sanity/icons`, `styled-components`, react; `dev`/`build`/`deploy`/`typegen` scripts |
| `studio/sanity.config.ts` | `defineConfig` — projectId/dataset from env, `structureTool({structure})`, `visionTool`. No `basePath`. |
| `studio/sanity.cli.ts` | `defineCliConfig` with `typegen: { enabled: true, path: '../{app,components,sanity}/**/*.{ts,tsx}', schema: 'schema.json', generates: '../sanity.types.ts' }` |
| `studio/env.ts` | projectId / dataset / apiVersion, asserted |
| `studio/structure.ts` | Content list: Courses, Lessons, Instructors, Categories |
| `studio/schemaTypes/index.ts` | Exports every type below |
| `studio/schemaTypes/documents/course.ts` | title, slug, summary, coverImage, glyph, level, price, popular, studentCount, learningOutcomes[], instructor→, category→, modules[] |
| `studio/schemaTypes/documents/lesson.ts` | title, slug, videoUrl, poster, durationSeconds, freePreview, studentCount, notes (PT), keyPoints[], proTip, resources[] |
| `studio/schemaTypes/documents/instructor.ts` | name, slug, photo, expertise[], bio (PT) |
| `studio/schemaTypes/documents/category.ts` | title, slug, description |
| `studio/schemaTypes/objects/module.ts` | title, summary, lessons[] (references) |
| `studio/schemaTypes/objects/learning-outcome.ts` | icon (list of `iconNames`), title, description |
| `studio/schemaTypes/objects/resource.ts` | type (list), title, description, url |
| `studio/schemaTypes/objects/block-content.ts` | Portable Text array for notes and bio |
| `studio/.gitignore`, `studio/tsconfig.json`, `studio/.env.example` | standard |

**Deleted from the web root** — `app/studio/[[...tool]]/`, `sanity.config.ts`, `sanity.cli.ts`,
`sanity/structure.ts`, `sanity/schemaTypes/`.

**Changed / new in the web app**

| File | Change |
|---|---|
| `sanity/env.ts` | keep; add `SANITY_API_READ_TOKEN` assertion in a sibling `token.ts` |
| `sanity/lib/token.ts` | **new** — `import 'server-only'`, exports the asserted read token |
| `sanity/lib/client.ts` | keep `useCdn: true`, add `perspective: 'published'`; the token is attached in `live.ts`, never here |
| `sanity/lib/live.ts` | pass `serverToken: token`; **no** `browserToken` |
| `sanity/lib/queries.ts` | **new** — all `defineQuery` GROQ below |
| `sanity/lib/fragments.ts` | **new** — shared image / lesson-card / module projections |
| `components/portable-text.tsx` | **new** — `@portabletext/react` renderer for notes and bio |
| `app/layout.tsx` | render `<SanityLive />` |
| `sanity.types.ts` | **new**, generated, committed |
| `package.json` | add `@portabletext/react`, `@tailwindcss/typography`, `server-only`; remove `@sanity/vision`, `sanity`, `styled-components` (they move to `studio/`); add `typegen` script |
| `.gitignore` | add `!.env.example` |
| `.env.example` | **new**, committed — the canonical env list (AGENTS.md §12) |
| `README.md` | how to run both workspaces |

## The queries

All in `sanity/lib/queries.ts`, all `defineQuery`, all uniquely named (TypeGen overwrites duplicates).

- `COURSES_CATALOG_QUERY` — every course with a slug, ordered `popular desc, title asc`; projects
  title, slug, summary, coverImage, glyph, level, price, popular, studentCount, category->, instructor->,
  and derived `"moduleCount": count(modules)`, `"lessonCount": count(modules[].lessons[])`,
  `"durationSeconds": math::sum(modules[].lessons[]->durationSeconds)`.
- `COURSE_BY_SLUG_QUERY` — one course by `$slug`, plus expanded `modules[]{_key, title, summary,
  lessons[]->{...lesson card fields}}` and the full instructor.
- `COURSE_SLUGS_QUERY` — slugs only, for `generateStaticParams`.
- `LESSON_BY_SLUG_QUERY` — one lesson by `$slug` with notes, keyPoints, proTip, resources, and the
  **reverse-resolved parent course** (`*[_type == "course" && references(^._id)][0]`), since a lesson
  does not store its course (AGENTS.md §8). Also returns the sibling module and lesson positions so
  the page can derive the "Lesson 5.1" label.
- `LESSON_SLUGS_QUERY`, `INSTRUCTOR_BY_SLUG_QUERY`, `INSTRUCTOR_SLUGS_QUERY`,
  `CATEGORIES_QUERY`, `COURSES_BY_CATEGORY_QUERY`, `COURSES_BY_INSTRUCTOR_QUERY`.

Rules applied throughout: `_key` in every array projection; `order()` before any slice; `coalesce()`
for optional display fields; no whole-document `...` spreads that would drag unbounded arrays.

## Requirements

1. Every type uses `defineType` / `defineField` / `defineArrayMember`, has an `@sanity/icons` icon
   and a `preview` block that reads well in the Studio document list.
2. Slugs: `type: 'slug'`, `source: 'title'` (or `'name'`), `validation: required`, and an async
   uniqueness check per the schema skill.
3. Images use `options: { hotspot: true }` and carry a required `alt` field.
4. `modules[].lessons[]` are `reference` array members to `lesson` — modules are objects embedded in
   the course, never documents.
5. Validation: required on title/slug on every document; `price` and `studentCount` non-negative;
   `durationSeconds` a positive integer; `resource.url` a `uri` with http/https; `learningOutcomes`
   and `keyPoints` capped with a `.warning()` so the UI sections stay short.
6. No document stores anything derivable — no module index, no lesson index, no course duration.

## Security considerations

- `SANITY_API_READ_TOKEN` is read **only** from `sanity/lib/token.ts`, which starts with
  `import 'server-only'`. Any accidental client import becomes a build error, not a leak.
- The token is passed to `defineLive` as `serverToken` only. `browserToken` is deliberately omitted,
  so no token is ever shipped to the browser (AGENTS.md §12).
- Only `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET` and
  `NEXT_PUBLIC_SANITY_API_VERSION` reach the client; all three are safe by design.
- `.env.example` lists names and empty values only — never a real key.
- This change adds no route and no write path, so nothing new is exposed through `proxy.ts`.

## Acceptance criteria

- `studio/` runs standalone; the four document types appear in the Studio with icons and previews;
  creating a Course lets you pick an instructor, a category, and build modules of lesson references.
- The web root no longer contains `sanity.config.ts`, `sanity.cli.ts`, `app/studio/`, or any schema.
- `sanity.types.ts` is generated and contains a `_RESULT` type for every exported query.
- `npx tsc --noEmit` and `npm run lint` are clean in the web app; `npm run build` succeeds.
- `app/page.tsx` and `app/design-system/page.tsx` render exactly as they do today.
- No token appears in any client bundle (verified by grep over `.next/static`).

## Checks to run

```bash
# studio
cd studio && npm install && npm run typegen && npx tsc --noEmit

# web
npx tsc --noEmit
npm run lint
npm run build
npm run dev            # confirm / and /design-system unchanged, /studio now 404s

# Verify token is not in client bundles (fail if .next/static missing, command errors, or empty token found)
test -d .next/static || { echo "ERROR: .next/static missing; run build first" && exit 1; }
TOKEN="${SANITY_API_READ_TOKEN:?ERROR: SANITY_API_READ_TOKEN is not set or empty}"
if grep -rF "$TOKEN" .next/static 2>/dev/null; then
  echo "ERROR: token found in client bundle" && exit 1
else
  case $? in
    0) echo "ERROR: token found in client bundle" && exit 1 ;;
    1) echo "✓ no token in client bundle" ;;
    *) echo "ERROR: grep failed with status $?" && exit 1 ;;
  esac
fi
```

`sanity deploy` and `sanity schema deploy` (AGENTS.md §13) are **not** run in this change — they
need a deploy hostname decision from you, and the Context MCP that depends on them is a later task.

## Manual test steps

1. Create a Sanity read token (Manage → API → Tokens, **Viewer**) and add
   `SANITY_API_READ_TOKEN=…` to `.env.local`.
2. `cd studio && npm install && npm run dev` → open http://localhost:3333.
3. Add a Category ("Web Development") and an Instructor (name, photo, expertise, bio).
4. Add three Lessons with titles, slugs, a YouTube URL, a duration, and a paragraph of notes.
5. Add a Course; fill the marketing fields, pick the instructor and category, and add one Module
   containing the three lessons. Confirm the Studio preview shows the course title and cover.
6. Back in the web app: `npm run dev`, then in a node REPL or a scratch server component confirm
   `COURSES_CATALOG_QUERY` returns the course with a correct derived `lessonCount` of 3 and a
   `durationSeconds` equal to the sum of the three lessons.
7. Edit the course title in the Studio and confirm the value changes without a manual refresh
   (Live Content API), proving the `serverToken` path works against the private dataset.
8. Confirm http://localhost:3000/studio is a 404.
