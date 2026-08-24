# Implementation prompt: Seed Sanity from the provided seed files

## Goal

Load the supplied course content into the `production` dataset of Sanity project
`0sci1kt7` using the Sanity CLI importer, so the catalog, course, lesson and instructor
pages have real content to read. Content comes entirely from
`studio/scripts/seed/seed.ndjson`; nothing is authored or invented here.

Neither provided file is modified. `seed.ndjson` and `videos.json` are treated as
read-only inputs.

## What I read

- `AGENTS.md` — sections 5 (two workspaces, Studio owns content), 8 (the data being
  modeled), 9 (video documents are built by offline tooling, not here), 12 (private
  dataset, tokens stay server side), 13 (checks), 14 (keep it small).
- `sanity-best-practices` is not needed: no schema, GROQ or TypeGen work happens in this
  task. `sanity-migration` covers importing from another system; this is a plain NDJSON
  import of already Sanity-shaped documents, so only its import mechanics apply.

## Code and data I inspected

- `studio/scripts/seed/seed.ndjson` — 140 lines / 141 documents: 10 `course`,
  120 `lesson`, 6 `category`, 5 `instructor`. Deterministic `_id`s
  (`course.<slug>`, `lesson.<slug>`, `instructor.<slug>`, `category.<slug>`), so the
  import is idempotent. 135 images use the CLI's `_sanityAsset: "image@<url>"` form
  (10 course covers from picsum, 120 lesson posters from `i.ytimg.com`, 5 instructor
  photos), so the importer uploads them during the run.
- `studio/scripts/seed/videos.json` — 120 entries keyed by lesson slug, each
  `{id, title, channel, duration, query}`. Verified 1:1 against the lessons: every lesson
  slug has an entry, every `videoUrl` contains the matching YouTube id, and every
  `duration` matches. See "Decisions" 5 for why nothing is imported from it.
- `studio/schemaTypes/**` — `course`, `lesson`, `instructor`, `category`, plus the
  `module`, `learningOutcome`, `resource` and `blockContent` objects.
- `sanity/lib/fragments.ts`, `sanity/lib/queries.ts` — the web read layer, which selects
  `poster`, `durationSeconds`, `glyph`, `summary`.
- `components/ui/icon.tsx` — the 13 icon names the web app can render.
- `components/site/course-glyph.tsx` — the 3 course glyphs the web app can render.
- Live dataset state: `production` currently holds one stray `instructor`
  (`e2c601bc-29bf-406d-a7a0-a889a442569e`) and its photo asset, and nothing else.

## The mismatch this task exists to bridge

`seed.ndjson` is not shaped to the committed schema:

| Seed | Schema | Severity |
| --- | --- | --- |
| `lesson.thumbnail` | `lesson.poster` | required + `assetRequired` |
| `lesson.duration` | `lesson.durationSeconds` | required |
| `course.glyph` absent | required enum `nextjs \| docker \| typescript` | required |
| `learningOutcome.icon` ∈ {layers, workflow, gauge, rocket, sparkles, shield, puzzle, code} | 13-name list, no overlap | required enum |
| `lesson.summary` absent | optional | display gap |
| `instructor.title` absent | optional | display gap |

`sanity dataset import` does not validate against the schema, so importing verbatim would
succeed and then leave every lesson card and search result with an empty poster and no
duration, because the GROQ selects field names the documents do not have.

Everything else lines up. Portable Text in the seed uses only `normal` / `h2` styles,
`bullet` lists, plain spans and empty `markDefs` — all inside what `blockContent` allows.
Resource `type` is always `link`, which is in the schema's list. Course `level` values are
all in `beginner | intermediate | advanced`.

## Decisions and assumptions

1. **Transform at import, do not change the schema** (user's decision). A new script writes
   a schema-shaped copy of the seed to the scratchpad and imports that. The two provided
   files, `studio/schemaTypes/**`, `sanity/lib/**` and the web app are all untouched.
2. **Icon remap** — one-to-one, no collisions, chosen for the closest available meaning:
   `layers→folder`, `workflow→grid`, `gauge→clock`, `rocket→star`, `sparkles→target`,
   `shield→lock`, `puzzle→bookmark`, `code→file`. This is lossy and recorded as such.
3. **Glyph derived from the course's category**, so the mapping is deterministic and
   explainable rather than per-course taste: `web-development→nextjs`, `security→nextjs`,
   `languages→typescript`, `ai-engineering→typescript`, `data→docker`,
   `backend-infrastructure→docker`. Only three glyphs exist in
   `components/site/course-glyph.tsx`, so ten courses cannot each get their own mark.
4. **`lesson.summary` and `instructor.title` are left absent.** Both are optional in the
   schema, and filling them would mean writing content, which this task explicitly must
   not do. Flagged for the user instead.
5. **Nothing is imported from `videos.json`.** The schema has no `video` document type
   yet — per AGENTS.md sections 8 and 9 those documents carry `chapters` and `chunks` and
   are produced by the offline ingestion pipeline, which does not exist yet. `videos.json`
   carries no chapters or transcript chunks, so there is nothing to build a `video`
   document from today. Its role in this task is verification: the script asserts the
   lesson set matches it exactly, and fails the run if it does not.
6. **The stray instructor is deleted** (user's decision), so the dataset ends up as exactly
   the 141 seed documents. Its orphaned image asset is left in place; deleting assets is a
   separate cleanup and not worth the risk here.
7. **Plain import, not `--replace` and not `--missing`.** Deterministic `_id`s mean a
   re-run overwrites the same documents, so the seed stays idempotent without clearing the
   dataset.
8. **The transform script is committed** to `studio/scripts/seed/`, next to its inputs, so
   the seed is reproducible. It only ever reads the two provided files and writes to the
   scratchpad.

## Files I expect to touch

- `studio/scripts/seed/transform.mjs` — new. Reads the two provided files, applies the
  renames and the two maps, verifies the videos.json cross-check, writes the import file.
- `studio/package.json` — new `seed:transform` and `seed:import` scripts, so the run is
  repeatable and documented in the workspace that owns content.
- `prompts/seed-sanity-content.md` — this file.

Explicitly **not** touched: `studio/scripts/seed/seed.ndjson`, `studio/scripts/seed/videos.json`,
`studio/schemaTypes/**`, `sanity/lib/**`, any web route or component.

## Requirements

- The transform is pure: read the two inputs, write one NDJSON file to the scratchpad.
  It never writes into `studio/scripts/seed/` and never mutates its inputs.
- The transform fails loudly rather than silently passing bad data through. It must throw
  if a lesson has neither `thumbnail` nor `poster`, if an outcome icon is not in the map,
  if a course's category is not in the glyph map, or if the videos.json cross-check fails.
- Document count out is exactly document count in (141), with no `_id` changes.
- The import runs from `studio/` so it picks up `SANITY_STUDIO_PROJECT_ID` and
  `SANITY_STUDIO_DATASET` from `studio/.env.local`.
- Verification is a GROQ count run against the live dataset after the import, not an
  assertion about what the importer printed.

## Security considerations

- The import authenticates with the developer's own CLI login. No write token is created,
  read from env, or written to a file, and nothing in this task puts a token near the
  browser.
- The dataset stays private. This task adds no new read path and changes no client code.
- The importer fetches 135 images over the network from `picsum.photos` and `i.ytimg.com`.
  Both URLs come from the provided seed file, not from anything this task constructs.
- No secret is echoed into the terminal or into the transformed file.

## Acceptance criteria

1. `studio/scripts/seed/seed.ndjson` and `studio/scripts/seed/videos.json` are byte
   identical to what was provided (verified by checksum before and after).
2. The dataset contains exactly 10 `course`, 120 `lesson`, 5 `instructor` and
   6 `category` documents — 141 seed documents in total.
3. Zero instructors remain that are not one of the 5 seed instructors.
4. Every lesson has a `poster` with a resolvable `asset._ref`, and a positive integer
   `durationSeconds`. Zero lessons carry a leftover `thumbnail` or `duration` field.
5. Every course has a `glyph` in `nextjs | docker | typescript`, and every
   `learningOutcome.icon` is one of the 13 names `components/ui/icon.tsx` renders.
6. Every reference resolves: no module lesson reference, course instructor reference or
   course category reference points at a missing document.
7. 135 image assets are uploaded and referenced.

## Checks to run

- `node studio/scripts/seed/transform.mjs` — must exit 0 and report 141 documents.
- `sanity dataset import <file> production` from `studio/` — report the real output.
- The GROQ verification queries for acceptance criteria 2–7, run with
  `sanity documents query --api-version 2026-08-23`.
- `sha256sum` on both provided files, before and after.
- No web build is needed: no route, config or server module changes. `npm run typecheck`
  and `npm run lint` are still run at the end per AGENTS.md section 13, since
  `studio/package.json` changes.

## Manual test steps

1. From `studio/`, run `npm run dev` and open the Studio.
2. Open **Courses**. Expect 10, each with a cover image, an instructor and 4 modules.
3. Open *Next.js App Router in Depth*. Expect no validation errors in the top bar, a
   `glyph` set, 4 learning outcomes each with a rendered icon, and 4 modules of 3 lessons.
4. Open the lesson *File-system routing and the app directory*. Expect a poster image
   thumbnail in the preview, `5m 50s` as the preview subtitle (350 seconds), a YouTube
   `videoUrl`, notes with a heading and a bullet list, and no validation errors.
5. Open **Instructors**. Expect exactly 5, each with a photo. The stray unnamed test
   instructor is gone.
6. From the repo root, run `npm run dev` and open `/` — the home page is still the
   hardcoded reference and is expected to be unchanged by this task.
