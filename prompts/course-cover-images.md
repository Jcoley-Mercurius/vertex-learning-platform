# Implementation prompt: Branded course cover images

## Goal

Replace the random stock photos on the ten seeded courses with generated, on-brand cover images
that actually match the course. Each cover is built from the course's own glyph and palette — the
same marks the catalog cards and the course hero already use — so the Studio list, the catalog and
anywhere a cover is later rendered all show a picture that belongs to that course.

Content and tooling only. No page, component, query or schema changes.

## What I read

- `AGENTS.md` — section 5 (Studio and web are two standalone workspaces; the Studio must not import
  from the web app), section 8 (the course carries a cover image), section 9 (offline tooling builds
  content, never the request path), section 13 (Studio checks: import content).
- `prompts/seed-sanity-content.md` and `prompts/course-glyphs-and-outcome-icons.md` — how the seed
  pipeline and the glyph set were established.
- `sanity-migration` skill is not applicable: nothing is being migrated from another system; this
  regenerates assets for content already in the dataset.

## Code I inspected

- `studio/scripts/seed/seed.ndjson` — every course's cover is
  `"_sanityAsset": "image@https://picsum.photos/seed/vertex-<slug>/1600/900"`, i.e. a random
  photograph. Confirmed live: all ten assets have `originalFilename` `900`, and the pictures are a
  beach, a camera, a boat and so on. Lesson posters are different and already correct — they are
  real YouTube thumbnails (`i.ytimg.com/vi/<id>/hqdefault.jpg`) and are left alone.
- `studio/scripts/seed/transform.mjs` — already owns the course-side reshaping and holds
  `COURSE_GLYPHS`, the id→glyph map. `transformCourse` is where the cover gets repointed.
- `studio/package.json` — `seed` = `seed:transform` then `seed:import` (`sanity dataset import
  --replace`).
- `components/site/course-glyph.tsx` — the ten marks: two letterform tiles (Next.js, TypeScript),
  four vendor marks (Docker, React, Python, PostgreSQL) and four concept marks on palette tiles
  (LLM, RAG, system design, security).
- `app/globals.css` — the palette the covers draw from.

## Decisions and assumptions

1. **The generator lives in the Studio workspace and is self-contained.** The two workspaces are
   independent (AGENTS section 5), so the seed script cannot import the web app's React glyphs. The
   mark geometry is therefore restated as plain SVG in the generator, and the file says so. The
   glyph *names* stay the single shared vocabulary, validated against `COURSE_GLYPHS`.
2. **Covers are generated, not fetched.** No external image service, so the same input always
   produces the same cover and the seed is reproducible offline.
3. **PNG, 1600x900**, matching the aspect the seed already used, so nothing downstream changes.
4. **Design**: the course's brand colour as the field, the mark large and centred, and a restrained
   geometric treatment from the existing palette. No text on the cover — course titles are rendered
   as real type beside the image everywhere it appears, and baking type into an asset would fix the
   wording and the font in the wrong place.
5. **`@resvg/resvg-js` is added as a Studio devDependency** to rasterise the SVG. Verified it
   installs and renders here.
6. **Generated PNGs are committed** under `studio/scripts/seed/covers/`, so `npm run seed` works
   without a generation step, and the generator is a separate script that refreshes them.
7. **The site keeps its glyph tiles.** `design/vertex-course.png` shows a glyph, not a photo, so no
   page starts rendering `coverImage` as part of this change.

## Files I expect to touch

| File | Change |
|---|---|
| `studio/scripts/seed/covers.mjs` | **new** — the ten marks as SVG, renders 1600x900 PNGs |
| `studio/scripts/seed/covers/*.png` | **new**, generated and committed (one per glyph) |
| `studio/scripts/seed/transform.mjs` | `transformCourse` repoints `coverImage._sanityAsset` at the generated file and validates it exists |
| `studio/package.json` | add `@resvg/resvg-js` devDependency and a `seed:covers` script |

`seed.ndjson` is an input only and is not edited, matching the script's existing contract.

## Requirements

1. Each course's cover is the cover for its own glyph: Next.js gets the N tile, Docker the whale,
   Python the two-snake mark, and so on for all ten.
2. The generator is deterministic and offline: same input, byte-identical output.
3. `transform.mjs` throws if a course's cover file is missing, rather than importing a document
   with a dangling asset reference.
4. The import path is a `file://` URL, because the transformed ndjson is written outside the seed
   directory and relative asset paths would resolve against the wrong place.
5. Alt text on each cover keeps its existing "Cover image for <title>" value.
6. Nothing in the web workspace changes.

## Security considerations

- Generation is fully local; no external host is contacted for the images any more, which also
  removes a runtime dependency on picsum for anyone re-running the seed.
- The import uses the Studio's existing `.env.local` credentials; no new secret is introduced.
- Only seed content is rewritten. `sanity dataset import --replace` replaces the seeded documents
  by id and does not touch anything else in the dataset.

## Acceptance criteria

1. `node studio/scripts/seed/covers.mjs` writes ten PNGs, each 1600x900.
2. `npm run seed` in `studio/` transforms and imports without error.
3. `http://localhost:3333/structure/course` lists ten courses whose thumbnails are the branded
   marks, each matching its course.
4. Querying the dataset shows every course's `coverImage.asset->originalFilename` is the generated
   file, not `900`.
5. The web app still type checks, lints and builds, and the catalog and course pages look unchanged.

## Checks to run

- `node scripts/seed/covers.mjs` from `studio/`
- `npm run seed` from `studio/`
- a GROQ check that all ten covers point at the new assets
- `npx tsc --noEmit`, `npm run lint`, `npm run build` from the repo root (expected: unaffected)

## Manual test steps

1. `cd studio && npm run seed`.
2. Open `http://localhost:3333/structure/course` and confirm each row's thumbnail is that course's
   mark on its brand colour.
3. Open a course in the Studio and confirm the cover image field shows the same asset with its alt
   text intact.
4. Open `http://localhost:3000/` and a course page and confirm they are unchanged.

## Deviations from the plan (recorded during implementation)

- Mark placement went through a `centred({cx, cy, scale})` helper rather than hand-written
  transforms: none of these marks are centred inside their own source viewBox, so the first pass
  put the Docker whale and the LLM sparkle off to one side.
- The two letterform covers (Next.js, TypeScript) render real type, so generating them depends on a
  serif and a sans being installed on the machine that runs `seed:covers`. The rendered PNGs are
  committed, so the seed import itself has no font dependency. Every other mark is pure geometry.
- `docker` uses Docker's current blue (`#1d63ed`) as the ground with the mark in white, rather than
  the older `#2496ED` the app's card glyph draws the whale in, because the whale needed to sit on a
  ground rather than beside one.
