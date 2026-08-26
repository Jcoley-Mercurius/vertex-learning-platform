# Video ingestion pipeline (and video moments in search)

## Goal

Build the offline tooling from AGENTS.md section 9: one `video` document per unique
video URL, holding the source's chapter markers as a table of contents and the
transcript split into short timestamped chunks. Then turn on the half of search
that this unlocks — video moment results, chapters first and transcript as the
fallback (sections 7 and 11).

The pipeline never runs in the request path. It is a script in the Studio
workspace that writes NDJSON and imports it.

## Scope decision from the user

Asked whether this task stops at the pipeline or also flips search over to video
results. The user chose **pipeline + enable video search**. So this covers the
schema, the ingestion tooling, the ingest itself, the inline system prompt, and
the `sanity.agentContext` instructions.

## Skills and docs read

- `AGENTS.md` sections 5, 7, 8, 9, 11, 12, 13.
- `.agents/skills/sanity-best-practices/SKILL.md` — global rules and the video
  section (store only the provider URL in Sanity; never the media itself).
- `.agents/skills/dial-your-context/SKILL.md` — Instructions are pure deltas,
  never a restatement of the schema, and every claim is evidence-backed.

## Code and data inspected

- `studio/schemaTypes/documents/lesson.ts` — `videoUrl` (required url),
  `durationSeconds` (required int), `poster`, `keyPoints`, `notes`. No parent
  course, no video reference.
- `studio/schemaTypes/index.ts` — the registration list a new document joins.
- `studio/scripts/seed/transform.mjs` + `studio/package.json` — the established
  offline-script shape: read inputs, write NDJSON *outside* the script's own
  directory, import with `sanity dataset import --replace` under CLI auth,
  dataset name sourced from `studio/.env.local`.
- `studio/scripts/seed/videos.json` — 120 seed entries, 120 unique YouTube ids.
- `studio/scripts/seed/seed.ndjson` — 120 lessons, 120 `videoUrl` values, all
  `youtube.com/watch?v=`. Zero non-YouTube URLs.
- `lib/video.ts` — `parseVideoUrl` already normalises a YouTube URL to
  `{provider, id}` and is the existing authority on which providers count as
  supported. The ingest script mirrors its id extraction; it cannot import it
  (Next.js TS, other workspace).
- `app/api/search/route.ts` — **already** hydrates `kind: "video"` results:
  clamps `startSeconds` to the runtime, attaches poster and alt. No route change
  is needed for video cards to work.
- `components/search/search-results.tsx:181` — already branches on
  `result.kind === "video"` and renders the moment card with `formatTimestamp`.
- `lib/search/types.ts` — `searchOutputSchema` already accepts
  `kind: "video"` + `startSeconds`. No type change needed.
- `lib/search/prompt.ts` — currently states "This dataset has no video documents"
  and forbids emitting `kind: "video"`. Stale the moment this lands.
- `sanity.agentContext.vertex-search` (read live via the Sanity MCP) — `filter`
  is `null`, so every type is already visible to the agent and a new `video` type
  needs no filter change. Its instructions carry the same stale "There are no
  `video` documents" claim.

## What I verified before choosing an approach

Transcript sourcing is the risky part, so I tested it rather than assuming:

- `youtubei.js` v18 `getInfo` works and returns chapters, but `getTranscript()`
  fails with `400 Precondition check failed` on the `get_transcript` endpoint.
- Fetching `captions.caption_tracks[].base_url` directly returns HTTP 200 with a
  **zero-byte body**, with every `fmt`/`c` workaround I tried. YouTube's current
  timedtext gating blocks the plain-fetch path.
- `yt-dlp` (2026.08.19, installed with pip) works on both counts in one call:
  `--dump-single-json` returns `duration`, `chapters[]` with
  `{start_time, title, end_time}`, and the caption track inventory; and it
  downloads `json3` captions with per-cue `tStartMs`.
- Sampled 8 of the 120 videos: 5 had source chapters (5–21 each), 3 had none.
  Every one of the 8 had English captions — 2 manual, 6 auto only.

So: **yt-dlp is the ingestion source**, and it is a documented prerequisite of
the script rather than an npm dependency.

## Decisions and assumptions

1. **`video` is a new document type**, `studio/schemaTypes/documents/video.ts`,
   registered in the schema index. Fields, per section 8: `videoId` (string),
   `url` (url), `provider` (string, `youtube` only for now), `title` and
   `durationSeconds` for operator sanity in the Studio, `chapters[]` of
   `{startSeconds, label}`, `chunks[]` of `{startSeconds, text}`. Chapter and
   chunk are inline object types in the same file — nothing else uses them. The
   type is marked read-only in the Studio (`readOnly: true` on the fields) with a
   description saying the pipeline owns it, so nobody hand-edits ingested data.
2. **Deterministic document id**, `video.youtube-<videoId>`. This is the one place
   the sanity-best-practices "let Sanity generate ids" rule is deliberately
   overridden: the pipeline must be re-runnable and idempotent, and the id is the
   natural key (section 9 says exactly this — key by an id derived from the URL,
   stripping characters the datastore rejects). YouTube ids are
   `[A-Za-z0-9_-]{11}`, all legal in a Sanity id; the script still strips anything
   outside that class before building the id.
3. **Lessons link to videos by URL, not by reference** (section 8). No lesson
   schema change, no re-import of lesson documents. The join is
   `*[_type == "video" && url == ^.videoUrl][0]`.
4. **The video list comes from the live dataset**, not from `seed/videos.json`.
   The script queries distinct `lesson.videoUrl` values with the read token, so it
   stays correct for lessons added after the seed.
5. **Chunking**: caption cues are merged into a chunk until it reaches ~280
   characters or spans ~30 seconds, whichever comes first. `startSeconds` is the
   first cue's start, floored to a whole second. Rationale: a chunk has to be big
   enough to carry a matchable concept and small enough that the seek lands on the
   sentence that says it.
6. **Caption preference**: manual English (`subtitles.en`, then any `en-*`) first,
   auto English (`automatic_captions.en`, then `en-orig`) second. Auto json3
   carries rolling-duplicate cues, so events with `aAppend` are skipped and
   segment text is whitespace-normalised (`\xa0` → space, collapse runs, drop
   empties) before chunking.
7. **No chapters is a legitimate outcome.** When the source has none, `chapters`
   is written empty rather than synthesised. Section 7 says chapter labels are
   clean and transcript is the noisier backstop — inventing labels off transcript
   text would put noise where the agent expects signal, and the transcript
   fallback already covers those videos.
8. **A raw cache** at `studio/scripts/videos/.cache/<videoId>.json` (gitignored)
   holds the yt-dlp info JSON and the raw cue list, so re-chunking with different
   parameters costs no network. `--refresh` bypasses it.
9. **Import, not client writes.** The script emits NDJSON to
   `${TMPDIR:-/tmp}/vertex-videos.ndjson` and a separate npm script imports it
   with `sanity dataset import --replace`, matching `seed:transform` /
   `seed:import`. `--replace` only touches the ids present in the file, so course
   and lesson content is untouched. No write token is introduced.
10. **`durationSeconds` on the video document is yt-dlp's**, and it may disagree
    with the lesson's seeded duration. The lesson stays the authority for the UI
    (the route already clamps to it); the video's copy is informational.
11. **Search prompt and Context instructions are rewritten together**, with the
    critical rules duplicated in both (section 12). The prompt gains: how to join a
    lesson to its video, chapters-before-transcript resolution, the rule that a
    video document is never a result on its own, and — most important — the rule
    that `chunks` and `chapters` are never fetched whole, only as a filtered slice
    of a few entries per video.

## Files I expect to touch

Studio:
- `studio/schemaTypes/documents/video.ts` (new)
- `studio/schemaTypes/index.ts` (register `video`)
- `studio/scripts/videos/ingest.mjs` (new — fetch, chunk, emit NDJSON)
- `studio/scripts/videos/README.md` (new — the yt-dlp prerequisite and usage)
- `studio/package.json` (`videos:ingest`, `videos:import`, `videos`)
- `.gitignore` (the ingest cache)

Web:
- `lib/search/prompt.ts` (video moment rules replace the "no video documents" block)
- `sanity.types.ts` (regenerated by TypeGen)

Sanity content:
- `sanity.agentContext.vertex-search` instructions, patched via the Sanity MCP.

Not touched: `app/api/search/route.ts`, `lib/search/types.ts`,
`components/search/*` — they already handle video results.

## Requirements

- `node studio/scripts/videos/ingest.mjs [outFile]` reads distinct lesson video
  URLs from the dataset, fetches each video once, and writes one `video` document
  per unique URL as NDJSON.
- It refuses to write into its own directory, like `transform.mjs` does.
- Unsupported providers (anything `parseVideoUrl` would reject) are reported and
  skipped, not guessed at. A video with no usable English captions is reported and
  skipped — a video document with an empty `chunks` array would be a silent hole
  in search.
- yt-dlp missing produces one clear error naming the install command, not a stack
  trace per video.
- Fetches run with a small concurrency limit (4) and a per-video timeout, and one
  video's failure never aborts the run. The script ends with a summary: ingested,
  skipped with reasons, cached-vs-fetched, and it exits non-zero if anything was
  skipped.
- Re-running is idempotent: same input, same ids, same content.
- The search agent can find a moment, and only ever surfaces it attached to the
  lesson whose `videoUrl` matches.

## Security considerations

- Read only, offline. The script uses `SANITY_API_READ_TOKEN` from
  `studio/.env.local` to read lesson URLs; the write path is the Sanity CLI's own
  authenticated import. No new token, and no write token anywhere in the repo.
- The token is never logged, and nothing from the pipeline reaches the browser.
- Video ids are validated against `[A-Za-z0-9_-]{6,20}` before being spliced into
  a document id or a URL, so dataset content cannot shape either.
- yt-dlp is invoked with `spawn` and an argument array — never a shell string —
  so a URL from the dataset cannot become a command.
- Transcript text is stored as plain strings and rendered nowhere; it is an
  internal lookup only (section 7), and the search route hydrates every visible
  card field from lesson and course documents.

## Acceptance criteria

1. `video` appears in the deployed schema, and the Studio shows the ingested
   documents read-only.
2. Every lesson video URL in the dataset resolves to exactly one `video`
   document with a non-empty `chunks` array, or is listed in the skip summary
   with a reason.
3. Chapters are present for the videos whose source has them, and empty (not
   fabricated) for those that do not.
4. `chunks[].startSeconds` is monotonically increasing and within the video's
   duration; chunk text is clean prose with no rolling duplicates.
5. Re-running the ingest produces a byte-identical NDJSON file.
6. A search for a concept taught mid-video returns at least one
   `kind: "video"` result whose `startSeconds` lands within the chapter or chunk
   that actually discusses it, and the lesson page opens there.
7. No search response ever contains a video document as a result in its own
   right, and no timestamp appears for a lesson with no ingested video.
8. Type check, lint and build pass in web.

## Checks to run

- `cd studio && npm run videos` (ingest + import), then a GROQ spot check of the
  written documents.
- `cd studio && npm run schema:deploy` and `npm run deploy` — the Context MCP only
  serves a dataset with a deployed Studio application (section 12).
- `npm run typegen` from the repo root.
- In web: `npx tsc --noEmit`, `npm run lint`, `npm run build`.
- Live MCP verification of the new query patterns, per section 13, before
  trusting the prompt changes.

## Manual test steps

1. `cd studio && npm run videos:ingest` — read the summary; note anything skipped.
2. Run it a second time and confirm it reports cache hits and writes the same file.
3. `npm run videos:import`, then open the Studio and confirm a video document
   shows chapters and chunks, read-only.
4. Restart the web dev server (the initial context is cached for the life of the
   process — section 12).
5. Search for something taught partway into a known video, e.g. "revalidating
   cached data in next.js".
6. Confirm at least one result card is a video moment with a timestamp, and that
   the count and course count still read correctly.
7. Click it: the lesson page opens with `?t=` and the embed starts at that second,
   on the site.
8. Search for something with no video coverage and confirm the results are lesson
   cards with no timestamps.
9. Search a nonsense string and confirm the empty state still points at the
   catalog.
