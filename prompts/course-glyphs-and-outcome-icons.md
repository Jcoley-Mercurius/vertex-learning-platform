# Implementation prompt: Real course glyphs and outcome icons

## Goal

Remove the lossy mapping the seed import had to invent. Give each of the ten courses its
own glyph instead of sharing three, and let the eight learning-outcome icon names in the
seed render as themselves instead of collapsing onto unrelated existing icons.

The seed files stay untouched, as before. The fix is in the schema enums, the two icon
components, and the transform's maps — then the dataset is re-seeded.

## What I read

- `AGENTS.md` — sections 3 (UI work, reference is source of truth), 5 (workspace split),
  7 (glyph is display-only), 13 (checks), 14 (keep it small).
- `design/vertex-designsystem.png` — section 06 ICONS states the icon spec explicitly:
  24x24px grid, 2px stroke width (outline), rounded line caps, consistent optical balance.
  The sheet itself shows nine icons; `icon.tsx` already carries more than that, drawn to
  the same spec.
- `design/vertex-home.png` — the course cards show what a glyph is: an actual technology
  mark. Next.js is a white "N" on a black rounded tile, TypeScript is white "TS" on a
  #3178C6 tile, Docker is the full-colour whale with no tile at all.
- `sanity-best-practices` is not needed — this is an enum widening on two existing fields,
  not content modeling.

## Code I inspected

- `components/ui/icon.tsx` — `glyphs` object of `{outline, filled?}`, `satisfies
  Record<string, IconGlyph>`, so `IconName` is derived from the keys. The `Icon` component
  renders a 24x24 viewBox with `fill="none"`, `stroke="currentColor"`, `strokeWidth={2}`,
  rounded caps and joins. `filled` is optional; without it the filled variant just renders
  the outline at `strokeWidth={3}`.
- `components/site/course-glyph.tsx` — `CourseGlyphName` union of three, a shared `tile`
  class (`flex h-full w-full items-center justify-center rounded-lg`), two letterform
  tiles and one inline-SVG whale on a 64x48 viewBox. `CourseGlyph` dispatches with two
  `if`s and a fallback `return <DockerGlyph />`.
- `studio/schemaTypes/objects/learning-outcome.ts` — `icon` is a required string with a
  13-entry `options.list`.
- `studio/schemaTypes/documents/course.ts` — `glyph` is a required string with a 3-entry
  radio list, `initialValue: 'nextjs'`.
- `studio/scripts/seed/transform.mjs` — the `OUTCOME_ICONS` and `CATEGORY_GLYPHS` maps
  written for the seed import, and the throw-on-unmapped guards around them.
- `sanity/lib/queries.ts` / `fragments.ts` — both select `glyph` and
  `learningOutcomes[]{icon,...}` as opaque strings. No projection changes are needed.
- `app/page.tsx` — hardcoded reference data using `glyph: "nextjs" | "docker" |
  "typescript"`. Still valid after the union widens; untouched.
- `sanity.types.ts:67,172` — the generated unions that must be regenerated.
- `app/globals.css` — the token set: `primary-500 #f97316`, `neutral-900 #0f172a`,
  `neutral-700 #334155`, `accent-indigo #4f46e5`.

## Decisions and assumptions

1. **Eight new outline icons, drawn to the documented spec** rather than remapped:
   `layers`, `workflow`, `gauge`, `rocket`, `sparkles`, `shield`, `puzzle`, `code`. All on
   the 24x24 grid, stroke-only, no `filled` variant — none of them needs one, and the
   component already degrades gracefully. This is following the design system's stated
   icon spec, not designing something new, which is why it does not need a reference image.
2. **The existing 13 icon names stay.** The schema list becomes 21 entries, not a
   replacement set, so nothing already authored in the Studio breaks.
3. **Seven new course glyphs, one per remaining course** (user's decision: simplified brand
   marks where a real mark exists, concept marks otherwise). The reference already mixes a
   simplified logo (the whale) with letterform tiles, so both treatments are in-system:
   - `react` — the atom: one nucleus circle and three rotated ellipses, `#61DAFB` on a
     `#20232A` tile, which is React's own presentation.
   - `python` — the two interlocking snakes, simplified, `#3776AB` and `#FFD43B`, no tile,
     the same treatment the whale gets.
   - `postgres` — the elephant head, simplified, `#336791`, no tile.
   - `llm` — a sparkle, white on a `primary-500` tile.
   - `rag` — stacked layers behind a magnifier, white on an `accent-indigo` tile.
   - `system-design` — a three-node graph, white on a `neutral-700` tile.
   - `security` — a shield with a check, white on a `neutral-900` tile.
4. **The four concept marks use design-system tokens, not invented colours.** Picking
   arbitrary violets and teals would drift from the palette in section 01 of the reference;
   `primary-500`, `accent-indigo`, `neutral-700` and `neutral-900` are all already in
   `globals.css`.
5. **The three brand marks are stylised, not pixel-accurate.** They are drawn from memory
   in inline SVG, consistent with the existing whale, which is itself a simplified
   reconstruction. Recorded as a known limitation rather than presented as exact logos.
6. **`CourseGlyph` switches from `if`-chains to a lookup record** keyed by
   `CourseGlyphName`, so the union and the renderer cannot drift apart as ten entries. The
   union stays the source of truth for the type.
7. **The transform's `OUTCOME_ICONS` map is deleted, not made an identity map.** Once the
   schema accepts the seed's own names there is nothing to translate; the script keeps a
   validation set and still throws on an icon it does not recognise.
8. **`CATEGORY_GLYPHS` becomes `COURSE_GLYPHS`, keyed by course `_id`,** one entry per
   course. Deriving from category was only ever a way to spread three marks across ten
   courses; with ten marks the mapping is direct.
9. **The seed is re-run, not patched.** `npm run seed` is idempotent on the deterministic
   `_id`s, so re-importing overwrites the ten courses in place. No documents are deleted
   and the 135 assets are already uploaded, so the re-run is fast.
10. **`npm run typegen` regenerates `sanity.types.ts`.** This also resolves the stray
    uncommitted diff in that file flagged after the seed task — it will be a clean
    regeneration against the deployed schema rather than a leftover.

## Files I expect to touch

- `components/ui/icon.tsx` — add 8 glyph entries.
- `components/site/course-glyph.tsx` — widen `CourseGlyphName` to 10, add 7 marks, switch
  to a lookup record.
- `studio/schemaTypes/objects/learning-outcome.ts` — icon list 13 -> 21.
- `studio/schemaTypes/documents/course.ts` — glyph list 3 -> 10, keep `initialValue`.
- `studio/scripts/seed/transform.mjs` — drop the icon remap, key glyphs by course `_id`.
- `sanity.types.ts` — regenerated, not hand-edited.
- `prompts/course-glyphs-and-outcome-icons.md` — this file.

Explicitly **not** touched: `studio/scripts/seed/seed.ndjson`, `studio/scripts/seed/videos.json`,
`sanity/lib/**` (the projections already pass both fields through), `app/page.tsx`.

## Requirements

- Every seed icon name renders. After the change, `OUTCOME_ICONS` no longer exists and each
  of the eight names is a key in `glyphs` and an entry in the schema list.
- The glyph radio list in the Studio stays usable at ten entries; `layout: 'radio'` is kept
  since ten short titles still read fine in the Marketing group.
- New icons match the spec: 24x24 viewBox coordinates, no `fill` on stroke paths, no
  hardcoded stroke widths or colours inside the glyph (the component supplies them).
- The concept marks that sit on a tile use the shared `tile` class so they line up with the
  existing "N" and "TS" tiles on the 72px square the stacked card reserves.
- `CourseGlyph` must not silently fall back. An unknown name is a type error, and the
  lookup record makes the compiler enforce that all ten are implemented.
- The transform still throws on an unmapped icon or an unmapped course.
- Every glyph and icon carries no `aria-label`; they are decorative beside a visible course
  title, consistent with `aria-hidden` on the current whale.

## Security considerations

- Nothing in this task touches auth, tokens, the server/client boundary, or the search
  path. All new code is static inline SVG in presentational components.
- The re-import authenticates with the developer's CLI login, as before. No token is
  created, read, or written.
- No external asset is fetched: the marks are inline SVG, so no logo CDN or image host
  enters the request path.

## Acceptance criteria

1. `studio/scripts/seed/seed.ndjson` and `videos.json` are still byte identical
   (checksum verified).
2. All ten courses have a distinct `glyph`, and the ten values are exactly the ten
   `CourseGlyphName` members.
3. Zero learning outcomes in the dataset carry a remapped icon: the 40 outcomes hold only
   the eight original seed names.
4. Every icon name stored in the dataset is a key of `glyphs` in `icon.tsx`.
5. `sanity.types.ts` regenerates with a 10-member `glyph` union and a 21-member `icon`
   union, and the file is a clean typegen output.
6. `tsc --noEmit` and `eslint` pass in web; `tsc --noEmit` passes in studio.
7. `next build` succeeds.
8. The Studio shows no validation errors on any course.

## Checks to run

- `cd studio && npm run seed` — transform must report 141 documents, import must report
  141 imported.
- `cd studio && npx sanity schema deploy` — the deployed schema must carry the new enums,
  since the Context MCP reads the deployed schema.
- `npm run typegen` from the repo root.
- `npx tsc --noEmit` and `npm run lint` from the repo root; `npx tsc --noEmit` in `studio/`.
- `npm run build` from the repo root — components and generated types changed.
- GROQ verification for acceptance criteria 2-4.
- `sha256sum -c` against the checksums recorded before the first seed.

## Manual test steps

1. `cd studio && npm run dev`. Open **Courses** and check each of the ten shows no
   validation warning triangle.
2. Open *Building AI Apps with LLMs* → Marketing group. The glyph radio shows ten options
   with `llm` selected. The four learning outcomes show `sparkles`, `puzzle`, `code`,
   `rocket` rather than `target`, `bookmark`, `file`, `star`.
3. Open *PostgreSQL for Developers* → glyph is `postgres`; *Python for Data Work* →
   `python`; *React Performance Engineering* → `react`.
4. From the repo root, `npm run dev` and open `/`. The three reference course cards still
   render the "N" tile, the Docker whale and the "TS" tile exactly as in
   `design/vertex-home.png` — this task must not change the home page.
5. In the browser devtools, confirm the new marks are inline `<svg>` with no network
   request for any logo asset.
