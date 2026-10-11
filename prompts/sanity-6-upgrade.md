# Sanity Studio 6 upgrade

## Goal

Dependabot PR #19 bumps `sanity` and `@sanity/vision` from 5.31.2 to 6.18.0 (and `adm-zip`,
a transitive dependency with high-severity advisories) in `studio/`. As opened, it breaks the
Studio in two ways. Do the upgrade properly so the Studio type-checks, builds, deploys, and
the Context MCP keeps serving search. Also fix the latent type-check failure that a fresh
install of `main` already has, and stop it from coming back unnoticed.

## Skills and docs read

- `AGENTS.md` sections 5, 6, 12, 13: the Studio is a standalone workspace and deploys
  independently, the Context MCP only serves a dataset with a deployed Studio, and the
  `@sanity/context` plugin isn't installed.
- Sanity docs: [Studio v5 to v6](https://www.sanity.io/docs/help/v5-to-v6) and
  [Upgrading Sanity Studio](https://www.sanity.io/docs/studio/upgrade). v6 brings:
  - Node.js 22.12 minimum
  - React strict mode on in `sanity dev`
  - a static `auth.providers` array now replaces the defaults, and `auth.mode` is removed
  - the default Studio search strategy is now `groq2024`
  - Vite 8 / Rolldown for the build
  - Schemas, plugins, config shape and content APIs are unchanged. `@sanity/cli` v7+ comes
    with `sanity`.

## Code inspected

- `studio/package.json`: `sanity` and `@sanity/vision` ^5.31.2, `react` and `react-dom`
  ^19.2.8, `@sanity/client` ^7.26.2, `@sanity/icons` ^3.8.0. No `@types/node`. No `engines`.
- `studio/sanity.config.ts`: `structureTool` + `visionTool` only. **No** `auth`, `search`,
  `enableLegacySearch` or custom components.
- `studio/sanity.cli.ts`: `api`, `deployment.appId`, `typegen`. **No** `vite` option.
- `studio/schemaTypes/**`: plain `defineType`/`defineField`, with no custom React inputs.
  Strict mode has nothing of ours to double-run.
- `studio/env.ts` and `studio/sanity.cli.ts` read `process.env`.
- PR #19 branch, verified locally:
  - `npm ci` resolves `react` **19.3.0** but leaves `react-dom` at **19.2.8**.
    `sanity build` then fails: *"Incompatible React versions: react 19.3.0, react-dom 19.2.8"*.
  - `npx tsc --noEmit` fails with `Cannot find name 'process'` in `env.ts` and
    `sanity.cli.ts`.
- `main`, fresh `npm ci` in `studio/`: the same `process` type error. It's already latent:
  `@types/node` isn't in the Studio lockfile at all, and the existing local install only
  passes because it's older. `sanity build` succeeds on `main`.
- `.github/workflows/ci.yml`: covers only the web app, so neither break was caught.
- Local Node is 24.17 and CI uses Node 24, both above 22.12. Studio hosting builds on its own
  supported runtime.

## Decisions and assumptions

- **Branch:** a new `chore/sanity-6-upgrade` from `main`. Don't push onto Dependabot's branch.
  Once this merges, Dependabot closes #19 by itself because the dependency is already
  updated. If it doesn't, close #19 with a comment that links this PR.
- **Upgrade with npm itself** rather than hand-editing the lockfile:
  - `sanity` and `@sanity/vision` → `^6.18.0`.
  - `react` and `react-dom` → `^19.3.0` **together**, so they always resolve to the same
    version. Both are published at 19.3.0. This fixes the build error.
  - Add `@types/node` `^22` as a devDependency. That's the minimum runtime v6 supports.
    TypeScript picks it up automatically, so `tsconfig.json` doesn't change. This fixes the
    `process` errors on both `main` and #19.
  - Add `"engines": { "node": ">=22.12" }` to `studio/package.json`, matching v6's
    requirement.
  - `adm-zip` comes in transitively at 0.6.x, as in #19.
- **Not upgraded:** `@sanity/client` (7 → 8) and `@sanity/icons` (3 → 5). Both are separate
  majors with their own changes, and v6 doesn't need them. Leave them for their own
  Dependabot PRs.
- **The web app is untouched.** It keeps its own React 19.2.8 and `next-sanity`. The two
  workspaces don't share `node_modules`.
- **Studio search strategy:** accept the new `groq2024` default. It only affects the
  authoring desk's search box, not Vertex's learner search (which runs through the Context
  MCP and GROQ in `/api/search`).
- **CI:** add a second job, `studio`, to `.github/workflows/ci.yml`: Node 24, npm cache keyed
  on `studio/package-lock.json`, `npm ci` and `npx tsc --noEmit` in `studio/`. Not
  `sanity build`: `env.ts` requires the project id and dataset at build time, and the
  workflow stays secret-free. The build is verified locally here and by `sanity deploy`.
- **Deploy after merge:**
  - Redeploy the hosted Studio with `npm run deploy`. The Context MCP requires a deployed
    Studio, and the hosted one should match the repo.
  - Then `npm run schema:deploy`.
  - Both deploy from `main` after the PR merges, not from the branch.
- **README:** no change. Its commands don't change.

## Found during implementation

- **`npm run typegen` broke under the new CLI.** `sanity schemas extract` now refuses to
  overwrite an existing `schema.json` without `--force`, so the script failed after its
  first run. Fixed by adding `--force` to the `typegen` script in `studio/package.json`.
- **TypeGen output changed shape, not content.** `sanity.types.ts` now registers the query
  map under `declare global { interface SanityQueries }`, plus a `declare module
  "@sanity/client"` block that extends it for older clients. The result types themselves are
  byte-identical. A throwaway probe confirmed that `client.fetch(COURSE_SLUGS_QUERY)` still
  returns `COURSE_SLUGS_QUERY_RESULT`, not `any`.

## Files expected to touch

- `studio/package.json` (dependency versions, `@types/node`, `engines`)
- `studio/package-lock.json` (regenerated by npm)
- `.github/workflows/ci.yml` (new `studio` job)
- `prompts/sanity-6-upgrade.md` (this file)
- `sanity.types.ts` only if TypeGen output changes, which isn't expected. Any change gets
  reviewed and called out.

## Requirements

- In `studio/`, a fresh `npm ci` gives `react` and `react-dom` the same version and installs
  `sanity`/`@sanity/vision` 6.x.
- `npx sanity versions` reports `sanity` 6.18.x.
- `npx tsc --noEmit` and `npx sanity build` pass in `studio/` from a clean install.
- `npm run typegen` still works under CLI v7+, and `sanity.types.ts` is unchanged (or the
  diff is explained).
- The scripts used by `seed` and `videos` still exist under the new CLI.
  `npx sanity dataset import --help` lists `--replace` and `--dataset`.
- `sanity dev` loads the Studio with no strict-mode errors in the console. Courses, Lessons,
  Instructors, Categories and Videos open, and Vision runs a query.
- The web app's checks stay green: `npx tsc --noEmit` and `npm run lint` at the root.

## Security considerations

- No tokens or env values change. `studio/.env.local` stays gitignored. The CI job gets no
  secrets and keeps `permissions: contents: read`.
- The upgrade clears the open Studio advisories that the new versions fix, including
  `adm-zip`. Re-check the Dependabot alert list after merge and report what's left, without
  chasing it in this PR.

## Acceptance criteria

- The PR's CI shows both `check` (web) and `studio` jobs green, plus the Vercel preview.
- After merge and deploy, https://vertex-mercurius.sanity.studio loads on 6.18.x and edits
  work.
- Search still works end to end against the live Context MCP.
- #19 is closed (by Dependabot or with a linking comment).

## Checks to run

- `studio/`: clean `npm ci`, `npx sanity versions`, `npx tsc --noEmit`, `npx sanity build`,
  `npm run typegen` plus `git diff --stat sanity.types.ts`, `npx sanity dataset import --help`,
  and a short `npx sanity dev` smoke test.
- Root: `npx tsc --noEmit` and `npm run lint`. No `next build`, since no web routes, config or
  server code change.
- After merge: `npm run deploy` and `npm run schema:deploy` in `studio/`, then one search
  through the local dev server against the live MCP.

## Manual test steps

1. On the PR, confirm that the `check`, `studio` and Vercel checks are green.
2. After merge and deploy, open https://vertex-mercurius.sanity.studio. Open a course and a
   lesson, make a trivial edit, and discard it.
3. In the Studio's Vision tab, run `*[_type == "course"]{title}` and confirm it returns
   10 courses.
4. Signed in on https://mercurius-vertex.vercel.app/search, search `caching and revalidation`
   and confirm that results come back with "Watch from" moments.
5. Check that #19 is closed and the Dependabot alert list is shorter.
