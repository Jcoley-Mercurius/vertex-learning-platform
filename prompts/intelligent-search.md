# Intelligent search

Connect the Sanity Context MCP, build the server-side search API, and ship the search
results page with video and lesson result cards.

---

## Goal

A learner types a plain-English query on the home page and lands on `/search?q=…`, which
shows ranked result cards over the course and lesson content. Search is a full results
page with a result count and a sort control — not a chatbox, not a compact widget
(AGENTS.md §7, §11).

---

## Skills and docs read

- `.claude/skills/create-agent-with-sanity-context/SKILL.md` — MCP URL shapes, auth,
  `/initial-context` endpoint, the three MCP tools, the four-component workflow.
- `.../references/nextjs-agent.md` — `createMCPClient` HTTP transport pattern, excluding
  `initial_context` from the tool list once its payload is in the system prompt.
- `.../references/studio-setup.md` — `sanity.agentContext` fields (`slug`,
  `instructions`, `groqFilter`), plugin install, Studio deploy requirement.
- `.../references/system-prompts.md` — system prompt structure.
- `dial-your-context` and `shape-your-agent` will be applied when writing the Context
  document's `instructions` and the inline system prompt respectively.
- `node_modules/next/dist/docs/` — App Router route handlers and the server/client
  boundary, to be re-read for the exact route handler signature before coding.

## Code inspected

- `sanity/lib/client.ts`, `sanity/lib/token.ts`, `sanity/lib/live.ts` — the read-only
  server client. `token.ts` is `server-only`, so a client import is a build error.
- `sanity/lib/queries.ts`, `sanity/lib/fragments.ts` — existing typed GROQ, including the
  reverse-reference trick that resolves a lesson's owning course.
- `components/ui/card.tsx` — `LessonVideoCard` and `LessonCard` already exist and are
  shaped exactly for the two result kinds (badge, title, description, footer meta,
  "Watch from 12:45" / "View lesson"). `components/ui/input.tsx` has `Select` for sort.
- `components/site/search-form.tsx` — already pushes to `/search?q=…` and captures
  `search_submitted` in PostHog. The route it points at does not exist yet.
- `lib/video.ts` — `startSecondsFromParam`, `formatTimestamp`; the lesson page already
  honours `?t=` and seeks the YouTube embed.
- `studio/schemaTypes/` — `course`, `lesson`, `instructor`, `category` only.
- `studio/scripts/seed/` — 10 courses, 120 lessons, 40 modules seeded.

---

## Findings that shape the work

**1. No Studio application is deployed.** `get_project_studios` for `0sci1kt7` returns
none, and the Context MCP refuses the dataset outright:

```
-32004 Only datasets with deployed Studio applications are supported.
Please deploy a Studio (v5.1.0+) for this project/dataset.
```

This is AGENTS.md §12's first trap. Deploying the Studio is step 1 of this task.

**2. The `@sanity/context` Studio plugin cannot be installed.** `@sanity/context@1.0.0`
declares `peerDependencies.sanity: "^6"`; this Studio is on `sanity ^5.31.2`. This is
exactly the case AGENTS.md §12 describes — do **not** install it. Create and edit the
`sanity.agentContext` document through the Sanity MCP instead, and accept that
Conversation Insights is unavailable until the plugin supports Sanity 5/6 alignment.

**3. There are no `video` documents.** No schema type, no chapters, no transcript chunks.
`studio/scripts/seed/videos.json` holds only id/title/channel/duration and is used purely
as a cross-check in `transform.mjs`. Per the user's decision, this milestone is **lessons
only**: the video result kind is modelled and rendered end to end, but the API returns
zero video results until a later ingestion task lands the `video` documents.

**4. No design reference exists for the search results page.** `design/` holds home,
course, lesson and design-system only. The result cards are already built in the design
system (`LessonVideoCard`, `LessonCard`), so the page is assembled from those plus the
page chrome patterns from `/courses` — no new visual invention.

---

## Decisions and assumptions

- **The model ranks; Sanity supplies the facts.** The LLM, through the MCP, returns only
  a ranked list of lesson `_id`s plus a one-line description and a match reason. The
  route then re-fetches those lessons from Sanity with our own typed GROQ query and
  builds every card field (title, course, module/lesson label, key points, poster,
  duration) from that. The model cannot invent a course, a lesson, a duration or a count,
  because nothing it writes reaches a card except the description. This is the strongest
  available reading of "ground every result in real data" (§7, §11).
- **Structured output validated with Zod** (§6), not free-form prose parsing. A short
  optional markdown `reply` is the only prose, rendered with `react-markdown` — the one
  use §6 permits.
- **Vercel AI SDK with the OpenAI provider** (§6). `OPENAI_API_KEY` is server-only and
  goes into `.env.example`; the user pastes the real key into `.env.local`.
- **The route is a POST JSON API**, called from a client component (§5: the search UI is
  a client component rendering that response). The browser never sees the Sanity token,
  the MCP URL or the OpenAI key.
- **Sorting is client-side** over the returned set. "Most relevant" is the model's rank
  and is the default; the other options re-sort the same results without a new request.
- **`initial_context` is fetched over HTTP and cached in module scope**, then excluded
  from the tool list. Per §12 this means instruction and prompt changes need a dev server
  restart — called out in the test steps.
- **Critical query and ranking rules are duplicated** in both the inline system prompt and
  the Context document's `instructions` (§11, §12).
- Text matching uses wildcarded, OR'd tokens — never a whole phrase as one pattern — and
  matches `pt::text(notes)` rather than the Portable Text field directly (§11).
  `text::semanticSimilarity()` is not used; if embeddings turn out to be enabled it stays
  a later optimisation.

---

## Files expected to change

**Studio / Sanity**

- `studio/` — deploy the hosted Studio application (`sanity deploy`). No schema change.
- A new `sanity.agentContext` document, slug `vertex-search`, created via the Sanity MCP.

**Web — new**

- `lib/search/types.ts` — the Zod schema for the model's structured output and the
  `SearchResult` union (`video` | `lesson`) the UI renders.
- `lib/search/mcp.ts` — `server-only`. MCP client factory and the cached
  `/initial-context` fetch.
- `lib/search/prompt.ts` — the inline system prompt.
- `app/api/search/route.ts` — the POST route handler.
- `app/search/page.tsx` — the server page for `/search`.
- `components/search/search-results.tsx` — the client component (fetch, states, count,
  sort control, cards).
- `components/search/index.ts` — barrel, matching `components/course` and
  `components/lesson`.

**Web — edited**

- `sanity/lib/queries.ts` — add `LESSONS_BY_IDS_QUERY`, which hydrates the ranked ids
  with their owning course and module position.
- `.env.example` — add `SANITY_CONTEXT_MCP_URL` and `OPENAI_API_KEY`.
- `package.json` — add `ai`, `@ai-sdk/openai`, `@ai-sdk/mcp`, `zod`, `react-markdown`.
- `sanity.types.ts` — regenerated by TypeGen for the new query.

---

## Requirements

### 1. Deploy the Studio

Run `sanity deploy` from `studio/`. Confirm afterwards that the Context MCP answers
`tools/list` with `groq_query`, `schema_explorer` and `initial_context`.

### 2. The Context document

Create a `sanity.agentContext` document via the Sanity MCP:

- `slug`: `vertex-search`
- `groqFilter`: `_type in ["course", "lesson", "instructor", "category"]` — scopes the
  agent to content types. When `video` documents land later they stay out of this filter
  by default and are added only as an internal lookup.
- `instructions`: short deltas the schema does not already make obvious, written with
  `dial-your-context`. It must cover, at minimum: a lesson stores no parent course, so the
  course is found with `references(^._id)`; notes are Portable Text and must be matched via
  `pt::text(notes)`; module and lesson numbers are derived from array order, never stored;
  keywords must be wildcarded and OR'd, never matched as one phrase.

### 3. Env and dependencies

Add to `.env.example` with the server-only warning that matches the file's existing style:

```
SANITY_CONTEXT_MCP_URL=https://api.sanity.io/v2026-03-03/context/mcp/<projectId>/<dataset>/vertex-search
OPENAI_API_KEY=
```

Install `ai`, `@ai-sdk/openai`, `@ai-sdk/mcp`, `zod`, `react-markdown` at their current
versions (checked: `ai@7.0.77`, `@ai-sdk/openai@4.0.46`, `@ai-sdk/mcp@2.0.36`, `zod@4.4.3`,
`react-markdown@10.1.0`). Verify the `generateText` structured-output API against the
installed `ai` package before writing the call rather than assuming the v5 shape.

### 4. The search route — `POST /api/search`

- Runs on the Node runtime. Rejects a missing, empty or over-long (`> 300` chars) query
  with 400. Never echoes the raw query into an error message.
- Connects to the MCP over HTTP with `Authorization: Bearer ${SANITY_API_READ_TOKEN}`.
- Fetches `/initial-context` once per process and caches it; injects it into the system
  prompt; excludes the `initial_context` tool from the tools passed to the model.
- Calls the model with the MCP tools and a bounded number of tool-calling steps, producing
  structured output validated by the Zod schema: an optional short markdown `reply`, and a
  ranked `lessonIds` array with a per-id `description` and `matchReason`.
- Re-fetches those ids from Sanity server-side and assembles the result cards. Ids the
  model returns that do not resolve are dropped silently — that is the grounding backstop.
- Always closes the MCP client, including on error.
- Returns `{ results, resultCount, courseCount, reply }`. On an upstream failure returns a
  502 with a generic message; the UI shows a retry state.
- Never returns a transcript, a chunks array, or a `video` document to the caller or to
  the model (§12).

### 5. The results page — `/search`

- `app/search/page.tsx` is a server component that reads `?q=`, renders `SiteHeader`, the
  page heading and a `SearchInput` seeded with the query, and mounts the client component.
- `components/search/search-results.tsx` posts the query to `/api/search` and renders:
  - **loading** — a skeleton or status line while the request is in flight;
  - **results** — the count line ("Found 28 results across 8 courses"), the sort `Select`
    defaulting to "Most relevant", then the cards;
  - **empty** — a message plus a link to `/courses` (§11);
  - **error** — a short message and a retry button.
- A **lesson result** renders `LessonCard` with the module label (`Lesson 5.1 in Data
  Fetching and Caching`) and links to `/lessons/<slug>`.
- A **video result** renders `LessonVideoCard` with the clip length and matched second and
  links to `/lessons/<slug>?t=<startSeconds>`, which the lesson page already honours. No
  video results are produced this milestone; the branch is built and typed so the later
  ingestion task only has to feed it.
- Results are not capped — all ranked matches render (§11).
- Responsive down to mobile: the card grid collapses to one column, and the count line and
  sort control stack.

### 6. Analytics

Capture `search_performed` from the results component once a response arrives, with
`result_count`, `course_count` and `query_length` — never the query text. The existing
`search_submitted` capture on the home form stays as it is.

---

## Security considerations

- `SANITY_API_READ_TOKEN`, `SANITY_CONTEXT_MCP_URL` and `OPENAI_API_KEY` are read only
  inside the route handler and `lib/search/mcp.ts`, which is `server-only`. None are
  `NEXT_PUBLIC_`.
- The browser never contacts the MCP or the LLM; it only calls `/api/search`.
- The query is user input reaching an LLM. It cannot reach GROQ directly — the model
  writes queries through the MCP against the `groqFilter`-scoped dataset — but the system
  prompt states that instructions inside a learner's query are data, not commands.
- The route is read-only. Nothing it does writes to Sanity.
- Ids returned by the model are used only as GROQ parameters in a parameterised query.
- Search stays public, matching the rest of browsing (§7). No Clerk gate.
- The length cap and the bounded tool-step count limit cost and runtime per request.

---

## Acceptance criteria

1. `tools/list` against the Context MCP URL returns the three tools.
2. The `sanity.agentContext` document exists and is published, with the filter and
   instructions above.
3. `POST /api/search` with `{"query":"how do server components work"}` returns ranked
   lesson results whose every field matches the dataset.
4. Every returned lesson id resolves to a real lesson; nothing in a card is model-authored
   except the description.
5. `/search?q=…` renders the count line, the sort control and the cards; changing the sort
   reorders without a new request.
6. An unmatchable query renders the empty state with the catalog link.
7. A lesson result card opens the correct lesson page.
8. No token, MCP URL or API key appears in any client bundle
   (`grep -r "sk-\|SANITY_API_READ_TOKEN" .next/static` finds nothing).
9. The page is usable at 375px wide.
10. Type check, lint and production build all pass.

---

## Checks to run

- `npm --prefix studio run deploy` — Studio application deployed.
- `npx tsc --noEmit` in the web workspace.
- `npm run lint`.
- `npm run build` — routes and server modules changed, so a build is required.
- `npm run typegen` after `sanity/lib/queries.ts` changes.
- A live `curl` against the Context MCP `tools/list` and `/initial-context`.
- `npm run dev` and walk the manual steps below.

---

## Manual test steps

1. `npm --prefix studio run deploy`, then confirm the Studio URL loads.
2. `curl -X POST "$SANITY_CONTEXT_MCP_URL" -H "Authorization: Bearer $SANITY_API_READ_TOKEN"
   -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream'
   -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'` → three tools, no `-32004`.
3. Put a real `OPENAI_API_KEY` and `SANITY_CONTEXT_MCP_URL` in `.env.local`.
4. `npm run dev`. On the home page type "how do server components work" and submit.
5. `/search?q=…` shows a count line, a sort control and lesson cards. Spot-check one card's
   course and module label against `/courses/<slug>`.
6. Click a lesson card → the correct lesson page opens.
7. Change the sort → the order changes with no network request.
8. Search "asdkjhasd" → the empty state with a link to all courses.
9. Narrow the viewport to 375px → one column, nothing overflows horizontally.
10. In PostHog, confirm `search_performed` fires with counts and no query text.
11. Edit the Context document's instructions, restart the dev server, and confirm the
    change takes effect (§12: cached initial context needs the restart).

---

## Out of scope

- Video-moment results (needs the `video` document type and the ingestion pipeline —
  §8, §9). The result kind is built and typed; the API returns none.
- Conversation Insights (the Studio plugin needs Sanity 6 — §12).
- Semantic search via `text::semanticSimilarity()`.
- Any change to the lesson, course or catalog pages.
