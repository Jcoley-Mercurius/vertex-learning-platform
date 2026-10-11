# Search spend protection

## Goal

Vertex is public as a portfolio demo at https://mercurius-vertex.vercel.app. Anyone who
signs up through Clerk can run searches, and every search is a billed OpenAI call
(`gpt-5`, up to 12 tool-loop steps). Put hard, layered limits on that spend so a curious
visitor, a bot farm, or a scripted abuser cannot run up the bill.

Defense in depth, outermost first:

1. **OpenAI account** (dashboard, user does this): a true hard cap on money.
2. **Clerk** (dashboard settings): make mass fake sign-ups hard.
3. **App** (code, this prompt): durable per-user and site-wide daily quotas, a kill switch,
   and a result cache so repeat queries cost nothing.

## Skills and docs read

- `AGENTS.md` sections 5, 7, 11, 12, 13 (server-only writes, write token in a server route,
  the search route owns the model call).
- `node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md`
  (`unstable_cache` for non-`fetch` work; the app does not enable `cacheComponents`).
- Clerk Next.js patterns (auth is already enforced in the route with `auth()`).

## Code inspected

- `app/api/search/route.ts`: requires a Clerk session (401 otherwise). It rate-limits
  10/min per user with an **in-memory `Map`**, which on Vercel is per serverless instance
  and resets on cold start, so it is not a real limit. There is no daily cap, no site-wide
  cap and no caching. Model is `gpt-5`, `MAX_STEPS = 12`, reasoning effort `low`.
- `components/search/search-results.tsx`: any non-OK response becomes a generic error
  state; the server's message (sign in, limit reached) is never shown.
- `sanity/lib/write-client.ts`: the server-only Editor client already used by
  `/api/progress`; the Vercel project has `SANITY_API_WRITE_TOKEN`.
- `proxy.ts`: Clerk middleware gates only `/my-learning`.

## Decisions and assumptions

- **Quota store: Sanity, through the existing server-only write client.** One small
  document per UTC day, `_id: "searchUsage-YYYY-MM-DD"`, `_type: "searchUsage"`, holding
  `total` and a `users` map of Clerk user id → count. Increments use Sanity's atomic `inc`
  with `returnDocuments`, so the check is race-free: increment first, read the new
  counts, and if either is over its limit, decrement back and reply 429. No new vendor or
  account. (Alternative if traffic ever grows: Upstash Redis via the Vercel Marketplace with
  `@upstash/ratelimit`. That is out of scope here.) The id uses `-`, not `.`, so it stays a
  root-path document the Editor token can write. It is not added to the Studio structure.
- **Defaults, all overridable by env without a code change:**
  - `SEARCH_DAILY_LIMIT_PER_USER=10`
  - `SEARCH_DAILY_LIMIT_GLOBAL=100` (site-wide circuit breaker across all users)
  - `SEARCH_ENABLED=true` (set to `false` to turn search off instantly; the route answers
    503 with a friendly message and makes no model call)
- **Result cache:** the expensive part (MCP plus model plus the Sanity read-back) is wrapped
  in `unstable_cache`, keyed on the normalized query (trimmed, lowercased, whitespace
  collapsed), with `revalidate: 86400` and tag `search`. Results are built only from shared
  catalog content and hold nothing per user, so sharing them across users is safe. A run
  that ends without structured output (`finishReason !== "stop"`) or throws is **not**
  cached.
- **Cache hits are free:** the quota is reserved before the run and refunded (`inc -1`) when
  the result came from the cache. A hit is detected by a `computedAt` timestamp older than
  the request. Known trade-off: once a quota is exhausted, even a query that would have been
  a cache hit is refused. That is acceptable and keeps the logic simple.
- **Replace the in-memory per-minute limiter** with the durable daily quota. Keep the
  existing burst limiter too, because it is cheap and still blunts a single-instance flood.
- **Failed runs are not refunded.** They still cost tokens.
- **Analytics:** `search_performed` gains `cached: boolean`. A new
  `search_quota_exceeded` event carries `scope: "user" | "global"`. No query text is added
  beyond what is captured today.
- **Model, step count and prompt are unchanged.** Changing them is a quality decision, not
  part of this change.

## Files expected to change

- `lib/search/quota.ts` (new, `server-only`): `reserveSearch(userId)` returns
  `{ ok: true } | { ok: false, scope }`, plus `refundSearch(userId)`, using
  `getWriteClient()`.
- `app/api/search/route.ts`: kill switch, then auth, then validate, then reserve, then
  cached run, then refund on a hit, then respond. 429 and 503 bodies carry a
  user-facing `error` message.
- `components/search/search-results.tsx`: on a non-OK response, show the server's
  `error` message (sign in, daily limit reached, search paused) in the existing error
  state instead of the generic text. No new styling.
- `.env.example`: document the three new variables.
- Vercel: add the three variables to Production and Preview.

## Security considerations

- The quota is keyed only on the Clerk session `userId` from `auth()`, never on anything
  from the body.
- The write token stays inside `getWriteClient()`; the browser gains no new capability.
- The kill switch and the limits run before any MCP or OpenAI call.
- The usage documents hold Clerk ids and counts only, in the private dataset.

## Acceptance criteria

- The 11th search by one user in a UTC day gets a 429 with a clear message, and the UI
  shows it.
- After 100 billed searches site-wide in a day, everyone gets 429 until UTC midnight.
- Repeating an identical query (any user, within 24h) returns instantly, makes no OpenAI
  call, and does not count against the quota.
- `SEARCH_ENABLED=false` returns 503 with a friendly message and no model call.
- Signed-out users still get the 401 sign-in message, now visible in the UI.

## Checks

- `npx tsc --noEmit`, `npm run lint`, `npm run build` (web).
- Local: `npm run dev`, sign in, run searches, and inspect the `searchUsage-<today>`
  document with the Sanity MCP `query_documents`.
- Deploy to Vercel with `main` (after a PR), then repeat on production.

## Manual test steps

1. Sign in on the live site and search "context windows". Results appear and
   `searchUsage-<today>` shows `total: 1`.
2. Search "context windows" again. It returns instantly and the count stays at 1.
3. Set `SEARCH_DAILY_LIMIT_PER_USER=2` in Vercel, redeploy, and run two new queries. The
   third shows "You've reached today's search limit".
4. Set `SEARCH_ENABLED=false` and redeploy. Search shows the paused message.
5. Restore the env values.

## Outside the code (account settings, done alongside)

- **OpenAI (user):** create a dedicated "Vertex" project with its own API key. Use
  prepaid credits with **auto-recharge off**, which is the only true hard cap. Also set a
  monthly budget with email alerts on the project. Then replace `OPENAI_API_KEY` in Vercel.
- **Clerk:** in User and Authentication → Attack protection, turn on **Bot sign-up
  protection** (CAPTCHA) and **Block disposable email domains**. Make **email
  verification** required at sign-up. Keep sign-up open so reviewers can try the demo; for
  a private demo, switch to **Restricted** mode or an allowlist instead.
