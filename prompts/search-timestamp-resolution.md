# Two-stage timestamp resolution and on-site timestamped playback

## Goal

Make the "watch from the matched second" path real end to end and provably grounded:

1. **Two-stage resolution moves into the server.** Chapters are matched first, transcript
   chunks are the fallback, and the resolution happens in our own GROQ — not only as
   advice in the system prompt.
2. **Every `startSeconds` on a card is verified against stored data.** A timestamp the
   model returns that does not correspond to a real chapter or chunk boundary in that
   lesson's video is snapped to one or dropped, exactly as an unresolvable lesson id is
   dropped today.
3. **A video card carries the clip length**, not the whole lesson runtime (AGENTS.md §11).
4. **The embedded player actually seeks.** It starts at `?t=` today, but only on first
   mount; a second deep link into the same lesson leaves it where it was.

## Skills and docs read

- `AGENTS.md` §5, §7, §8, §9, §11, §12, §13.
- `.claude/skills/create-agent-with-sanity-context/SKILL.md` — the MCP contract, the
  `initial_context` caching pattern, `groq_query`, and the "always project / include
  `_id`" query rules.
- `.claude/skills/dial-your-context/SKILL.md` — Instructions are pure deltas, every claim
  evidence-backed, no generalising from small samples.
- `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md` —
  `searchParams` is a promise, reading it opts the page into dynamic rendering; the
  `PageProps<"/lessons/[slug]">` helper is the current signature (already used).

## Code and data inspected

- `app/api/search/route.ts` — the model returns ids + `startSeconds`; `buildResponse`
  hydrates every other card field from Sanity, and the only thing done to `startSeconds`
  is a clamp to the lesson's runtime. **Nothing checks it against the video document.**
- `lib/search/prompt.ts` and the live `sanity.agentContext.vertex-search` instructions —
  both already carry the two-stage rule, the array-slicing rule and the grounding rule.
  Both are advisory: the model may skip the video pass entirely and every result is then
  a lesson result, and nothing detects that.
- `lib/search/types.ts` — `VideoSearchResult` carries `startSeconds`, `posterUrl`,
  `posterAlt`, `durationSeconds`. No clip length, no chapter label.
- `components/search/search-result-card.tsx` — the deep link
  `/lessons/<slug>?t=<startSeconds>` and the "Watch from 4:20" action already exist. The
  media panel's badge shows `durationSeconds`, i.e. the whole lesson runtime.
- `components/lesson/lesson-player.tsx` — click-to-play facade, then a YouTube IFrame API
  player mounted with `playerVars.start = startSeconds`. The player type has no `seekTo`,
  and no effect reacts to `startSeconds` changing after mount.
- `app/lessons/[slug]/page.tsx` + `lib/video.ts` — `?t=` is parsed and clamped server
  side (`startSecondsFromParam`) and passed down as `startSeconds`.
- `sanity/lib/queries.ts` — `SEARCH_LESSONS_BY_IDS_QUERY`; no video query exists in the
  web workspace at all.
- `studio/schemaTypes/documents/video.ts` — `chapters[] {startSeconds,label}`,
  `chunks[] {startSeconds,text}`, `url`, `durationSeconds`; joined to a lesson on
  `url == ^.videoUrl`.

**Live dataset check** (read token, `v2024-01-01` query API): 120 lessons, 120 `video`
documents, **82 with a non-empty `chapters` array** (so 38 are transcript-only — the
fallback stage is not hypothetical). Sample video `-BBulGM6xF0`: 8 chapters, 29 chunks.

## Decisions and assumptions

- **The model still ranks and still runs the video pass; the server verifies it.** The
  model's judgement about which moment matters is worth keeping. The route re-resolves
  each candidate against the stored chapters and chunks and only ships a timestamp it
  found there. This is the same backstop that already drops an invented lesson id, applied
  to the one field that currently has none.
- **Resolution order is chapters, then chunks** (AGENTS.md §7), decided per lesson.
- **A verified model timestamp wins.** If the model's `startSeconds` equals a real chapter
  or chunk boundary in that video, it is kept as-is. Otherwise the server's own best match
  replaces it. If neither exists, the result degrades to a lesson result rather than
  disappearing — the lesson still matched, it just has no moment.
- **The server may promote a lesson result to a video result, but only on a chapter
  match.** Chapter labels are clean authored text, so a promotion off one is grounded.
  Transcript-only promotion is deliberately not done: the prompt's own warning about
  fishing in 5,083 chunks of spoken filler applies just as much to us as to the model.
- **Keyword matching is token based**, per §11: each query token is lowercased,
  stop-worded, wildcarded and OR'd. The learner's phrase is never matched whole. Tokens
  shorter than 3 characters and a small stop list are dropped, and the token list is
  capped so one long query cannot build an unbounded GROQ filter.
- **Clip length** = next chapter's `startSeconds` − matched `startSeconds`, falling back
  to (lesson runtime − matched `startSeconds`) when the match is the last chapter or came
  from the transcript. The video card's badge shows this instead of the lesson runtime.
  This is a visible change to the card, and it is what §11 asks a video result to carry;
  the layout, position and styling of the badge are untouched.
- **The chapter label is carried but not drawn.** The design reference's meta row is
  `Lesson 5.1 · Module title`; adding a third item would deviate from it. The label goes
  into the link's accessible name ("Watch from 6:12, Greedy Decoding") and into the
  `search_result_opened` event instead.
- **One extra Sanity round trip per search**, run against the lessons the model already
  named. It is a filtered, sliced projection — never a whole `chunks` array (§12).
- **The prompt and the Context document are updated together** (§11, §12): the model is
  told plainly that the server verifies timestamps and drops unverifiable ones, so a
  guessed timestamp buys it nothing.

## Files expected to change

Web workspace:

- `sanity/lib/queries.ts` — new `SEARCH_VIDEO_MOMENTS_QUERY`: for the given lesson ids,
  join the video on `url == ^.videoUrl` and project only the chapters and chunks matching
  the wildcarded tokens, sliced, plus the chapter list reduced to `{startSeconds}` so the
  next boundary (the clip length) can be computed without pulling labels wholesale.
- `lib/search/timestamps.ts` (new) — `queryTokens()` (tokenise, stop-word, wildcard) and
  `resolveMoments()` (chapters → chunks → none, plus verification of the model's value and
  clip-length computation). Pure functions plus the one fetch, so the route stays readable.
- `app/api/search/route.ts` — call the resolver between the model's output and the card
  build; build video results from the resolved moment. New PostHog properties on
  `search_performed`: how many timestamps were verified, resolved by chapter, resolved by
  transcript, promoted, and dropped.
- `lib/search/types.ts` — `VideoSearchResult` gains `clipSeconds`, `chapterLabel`
  (nullable) and `matchSource: "chapter" | "transcript"`.
- `components/search/search-result-card.tsx` — badge shows `clipSeconds`; accessible name
  and the `search_result_opened` payload gain the label and match source.
- `components/lesson/lesson-player.tsx` — `seekTo` added to the player type; an effect
  seeks the live player when `startSeconds` changes; the poster affordance keeps
  click-to-play (nothing is requested from YouTube until the learner plays).
- `lib/search/prompt.ts` — the "Finding a moment inside a video" section rewritten around
  server verification.
- `sanity.types.ts` — regenerated by TypeGen for the new query.

Sanity content:

- `sanity.agentContext.vertex-search` `instructions`, patched via the Sanity MCP to match
  the new prompt.

Not touched: the `video` schema and the ingestion pipeline (the data they produce is
already the right shape), the lesson page's `?t=` parsing, the search page shell, sort.

## Requirements

- A video result's `startSeconds` is always a value present in that lesson's video
  document — a chapter's or a chunk's — never a model-authored number that was not found
  there.
- Chapters are matched before chunks, per lesson, always.
- The route receives the compact chapter index for containing-chapter and clip-end
  calculations; transcript chunks remain filtered and sliced, never returning the full
  chunks or chapters arrays.
- A lesson whose moment cannot be resolved still appears, as a lesson result.
- A lesson id the model returns that does not resolve to a lesson in a course still drops
  out, exactly as today.
- A video result deep links to `/lessons/<slug>?t=<startSeconds>` and the player starts
  there; navigating to the same lesson at a different `t` re-seeks rather than ignoring it.
- Result ordering (the model's rank) is unchanged by resolution; only a result's kind and
  timestamp can change.

## Security considerations

- The new fetch uses the existing server-only Sanity client with the read token
  (`sanity/lib/client.ts`); nothing new reaches the browser. `lib/search/*` stays server
  side and `mcp.ts` keeps its `server-only` guard.
- Query tokens are interpolated into a GROQ `match` filter, so they are sanitised to
  `[a-z0-9]` before wildcarding, and both the token count and each token's length are
  capped. The learner's raw query never reaches a query string.
- The learner's query remains data, never instructions (the prompt's existing rule stays).
- `?t=` stays clamped and integer-parsed server side before it reaches the player.

## Acceptance criteria

1. A query whose concept appears in a chapter label returns a video card whose timestamp
   equals that chapter's `startSeconds`, and the card's badge shows the clip length.
2. A query matching only transcript text on a chapterless video returns a video card at a
   real chunk `startSeconds`.
3. A query matching nothing inside any video returns lesson cards only — no timestamps.
4. Clicking a video card lands on `/lessons/<slug>?t=<n>`, the poster shows
   "Starts at m:ss", and playing starts at that second.
5. From that lesson, going back and opening a different moment in the same lesson seeks
   the already-mounted player.
6. `search_performed` reports the resolution mix; `search_result_opened` carries the match
   source.
7. Type check, lint and build pass.

## Checks to run

- `npx tsc --noEmit` (web)
- `npm run lint` (web)
- `npm run build` (web) — routes and server modules change
- `npm --prefix studio run typegen` before the type check, for the new query
- The new GROQ run directly against the live dataset with the read token, on a query with
  a known chapter hit and on one of the 38 chapterless videos
- One real search through `npm run dev` against the live MCP endpoint (§13)

No Studio deploy or schema deploy is needed — no schema changes. The Context document is
patched in place.

## Manual test steps

1. `npm --prefix studio run typegen`, then `npx tsc --noEmit`, `npm run lint`,
   `npm run build`.
2. `npm run dev`, sign in, and search **"greedy decoding"** (a known chapter label in the
   dataset). Expect a video card whose "Watch from" time matches that chapter and whose
   badge shows a short clip length, not a 20-minute runtime.
3. Click it. The lesson page opens with `?t=` set, the poster reads "Starts at m:ss",
   pressing play starts there.
4. Go back and open a different moment in the same lesson — the player seeks instead of
   restarting from the previous second.
5. Search something broad and conceptual (e.g. **"how do I cache data between requests"**)
   and confirm a mix of video and lesson cards, no card with a timestamp beyond the
   lesson's runtime.
6. In PostHog, check `search_performed` for the resolution counts and
   `search_result_opened` for `match_source`.
7. Note (§12): the Context document edit only reaches the agent after a dev server
   restart, because `initial_context` is cached in module scope.
