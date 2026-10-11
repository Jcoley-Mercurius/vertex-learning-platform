# Portfolio polish

## Goal

The repo is public at https://github.com/Jcoley-Mercurius/vertex-learning-platform and
serves as a portfolio piece (Upwork/Fiverr) for the live demo at
https://mercurius-vertex.vercel.app. Make it read well to a reviewer who spends two
minutes on it: an accurate README, a license, a green CI check, and no leftover clutter.
Change no app behavior.

## Skills and docs read

- `AGENTS.md`: sections 1, 5, 6, 7, 9, 13 (what the app is, architecture, stack, checks).
- No Sanity, Clerk or Next.js skill applies. This is docs, a license, and CI only.

## Code inspected

- `README.md`: written after the content-model phase. It says "four document types" (now six:
  course, lesson, instructor, category, video, progress) and leaves out search, Clerk auth,
  progress, bookmarks/notes/notifications, PostHog, the video ingestion pipeline, the spend
  guards and the live URL. Its setup and check commands are still correct.
- `app/`: pages `/`, `/courses`, `/courses/[slug]`, `/lessons/[slug]`, `/search`,
  `/my-learning`, `/design-system`, sign-in/up. Routes `/api/search`, `/api/progress`,
  `/api/notifications`.
- `studio/package.json`: `seed`, `videos` (ingest + import), `deploy`, `schema:deploy`,
  `typegen` scripts. `studio/scripts/videos/ingest.mjs` needs `yt-dlp`.
- `lib/search/quota.ts`: daily per-user and global quotas in Sanity, kill switch, 24h cache.
- `.env.example`: `SANITY_API_WRITE_TOKEN` has two stacked, near-duplicate comments.
- `posthog-self-driving-report.md`: a one-time setup report from a PostHog tool, sitting at
  the repo root. It isn't project documentation.
- No `LICENSE`, no `.github/`.
- `design/*.png`: the five desktop reference designs the UI reproduces.

## Decisions and assumptions

- **README rewrite**, same voice and tone as today, structured as:
  1. Title, one-line pitch, **Live demo** link, CI badge.
  2. A screenshot (`design/vertex-search.png`, then a small row of home, course and lesson).
     These are the reference designs the UI matches pixel for pixel. Captioned as designs,
     not passed off as screenshots. The user can swap in real captures later.
  3. **What it does**: the search (plain-language query → ranked video-moment and lesson
     cards → plays on site at the exact second), plus catalog, course, lesson, instructor,
     My Learning, progress, bookmarks/notes/notifications.
  4. **Try it**: two or three example queries that hit seeded content. Note that search
     needs a sign-in and has a small daily quota on the demo.
  5. **How search works**: short. Route → Sanity Context MCP → LLM writes GROQ →
     Zod-validated cards. Chapters first, transcript chunks as fallback. Grounded, no
     invented data. A small mermaid diagram (GitHub renders it).
  6. **Architecture**: the two workspaces and the server/client boundary (private dataset,
     tokens server-only, writes only through server routes).
  7. **Cost and abuse guards**: auth required, per-minute limiter, durable daily per-user
     and global quotas, 24h result cache, `SEARCH_ENABLED` kill switch.
  8. **Stack** list.
  9. Existing **Setup / Running / Content model / Data access / Checks** sections, updated
     (six types, the seed and videos scripts, yt-dlp prerequisite).
  10. **How it was built**: one paragraph on the agent workflow, with every feature planned
      as an approved implementation prompt in `prompts/` and rules in `AGENTS.md`.
  11. **License** line.
- **LICENSE**: MIT, copyright 2026 Josh Coley, unless the user picks otherwise.
- **CI**: `.github/workflows/ci.yml`, on push to `main` and on pull requests, Node 24, npm
  cache. It runs `npm ci`, `npx next typegen` (route and layout types live in the
  gitignored `.next/types`), `npx tsc --noEmit` and `npm run lint` at the repo root. **No
  `next build` in CI**: the build reads the private dataset and needs secrets. Vercel
  already builds every PR as a preview deploy and reports that check on GitHub, so a CI
  build would only duplicate it and put tokens in Actions.
- **Cleanup**: delete `posthog-self-driving-report.md` (it stays in git history). Merge the
  duplicate `SANITY_API_WRITE_TOKEN` comment in `.env.example` into one.
- **Out of scope**: OG metadata, tests, Clerk production keys, branch deletion (the user runs
  that), and anything under `app/`, `components/`, `lib/` or `studio/`.

## Files expected to touch

- `README.md` (rewrite)
- `LICENSE` (new)
- `.github/workflows/ci.yml` (new)
- `.env.example` (comment fix only)
- `posthog-self-driving-report.md` (delete)
- `prompts/portfolio-polish.md` (this file)

## Requirements

- Every claim in the README is true of the current code. No invented features, metrics or
  numbers. Example queries must return results against the seeded dataset.
- README commands are copy-pasteable and match `package.json` scripts.
- CI uses only pinned major versions of first-party actions (`actions/checkout@v4`,
  `actions/setup-node@v4`) and needs no secrets.

## Security considerations

- The README must not include tokens, project-specific secrets, or the Context MCP URL with
  real ids. The Sanity project id is public by design, but the README doesn't need it.
- The CI workflow uses the default read-only `permissions: contents: read` and gets no
  secrets.

## Acceptance criteria

- The README renders on GitHub with a working badge, an image, a mermaid diagram and a live link.
- `LICENSE` is detected by GitHub (the repo sidebar shows the license).
- The CI workflow passes on the PR.
- `.env.example` has one comment for `SANITY_API_WRITE_TOKEN`. The report file is gone.

## Checks to run

- `npx tsc --noEmit`
- `npm run lint`
- No build: no route, config or server code changes.

## Manual test steps

1. Open the PR on GitHub and confirm the **CI** check goes green next to the Vercel check.
2. Open the PR's README preview: the image, mermaid diagram, badge and live link all render.
3. Run one of the README's example queries on https://mercurius-vertex.vercel.app/search
   (signed in) and confirm it returns results.
4. After merge, check that the repo sidebar shows "MIT license".
