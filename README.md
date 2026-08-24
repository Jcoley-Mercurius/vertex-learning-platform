# Vertex

An AI-powered learning platform with search that links straight to the exact second
a topic is taught in a lesson video.

The repo holds two standalone workspaces:

| Workspace | What it is | Dev URL |
|---|---|---|
| repo root | The Next.js web app — pages, search UI, all server-side integration | http://localhost:3000 |
| `studio/` | Sanity Studio — the content schema and authoring, nothing else | http://localhost:3333 |

They are deliberately separate: the Studio builds on Vite, auto-updates itself, and
deploys independently of the site.

## Setup

```bash
# web app
npm install
cp .env.example .env.local     # then fill it in

# studio
cd studio && npm install
cp .env.example .env.local     # SANITY_STUDIO_PROJECT_ID / _DATASET
```

The Sanity dataset is **private**. The web app needs a `SANITY_API_READ_TOKEN`
(Sanity Manage → API → Tokens → Add token, **Viewer** permissions). It is read only
from `sanity/lib/token.ts`, which is `server-only` — no Sanity token ever reaches
the browser.

Add the web app's origin to the project's CORS origins so the Studio and the app can
both reach the dataset:

```bash
cd studio && npx sanity cors add http://localhost:3000 --credentials
```

## Running

```bash
npm run dev                  # web app on :3000
npm --prefix studio run dev  # studio on :3333
```

## Content model

Four document types, defined in `studio/schemaTypes/documents/`:

- **Course** — marketing fields plus an ordered list of embedded **modules**, each holding
  references to lessons. Module and lesson numbers ("Module 5", "Lesson 5.1") are derived
  from array order and never stored.
- **Lesson** — video URL, poster, duration in seconds, Portable Text notes, key points,
  a pro tip, and resources. A lesson does not store its parent course; the frontend
  resolves it with a reverse reference.
- **Instructor** and **Category** — referenced by courses, each with its own page.

## Data access

All content is read server-side. `sanity/lib/queries.ts` holds every GROQ query,
wrapped in `defineQuery` so TypeGen types the results.

```bash
npm run typegen   # regenerates sanity.types.ts from the schema and the queries
```

Types also regenerate automatically while `sanity dev` is running.

## Checks

```bash
npx tsc --noEmit
npm run lint
npm run build
```
