# Implementation prompt: Clerk auth controls in the site header

## Goal

Surface Clerk's signed-out and signed-in controls in the existing Vertex site header so a
learner can create and recognize their first account, and bring the two scaffolded auth
pages into the site's own chrome. Auth wiring itself (SDK, `ClerkProvider`, `proxy.ts`,
env keys) is already done by `clerk init`; this task is only the visible controls.

Nothing is gated in this task. Per AGENTS.md section 7 browsing stays public, and route
protection lands with the features that need it (progress, My Learning writes).

## What I read

- `AGENTS.md` — sections 3 (UI work), 5 (structure, auth boundary), 6 (stack),
  7 (Clerk decisions), 12 (secret-key rule), 13 (checks), 14 (keep it small).
- The `/clerk` setup command's Step 6 (`Show`, `SignInButton`, `SignUpButton`, `UserButton`).
- `node_modules/@clerk/nextjs/dist/types/index.d.ts` — confirmed `Show` is exported by the
  installed `@clerk/nextjs`, so the `Show when="signed-out" | "signed-in"` form is valid
  here (not the older `SignedIn` / `SignedOut` pair).

No Sanity/search skill applies. `clerk-custom-ui` covers appearance theming, which this
task deliberately does not need — the controls use the project's own Button styles and
Clerk's default modal.

## Code I inspected

- `components/site/site-header.tsx` — logo, `Courses` / `My Learning` links, a
  presentational bell button, and a placeholder avatar `<span>` with a `user` icon. Its
  doc comment already states Clerk's `UserButton` takes the avatar slot later. Shares a
  local `focusRing` string for focus-visible styling.
- `components/ui/button.tsx` — `Button`, plus `buttonClassName({ variant, size })` for
  elements that cannot be a `<button>`. Variants `primary | secondary | tertiary | text`,
  sizes `md | lg | hero`.
- `components/ui/index.ts`, `components/site/index.ts` — barrel exports.
- `app/layout.tsx` — `ClerkProvider` already wraps the body contents; `SiteHeader` is
  rendered per page, not in the layout.
- `app/page.tsx` — renders `<SiteHeader />` at the top of the home page.
- `app/sign-in/[[...sign-in]]/page.tsx`, `app/sign-up/[[...sign-up]]/page.tsx` — bare
  `clerk init` scaffolds: a `min-h-screen` flex wrapper around `<SignIn />` / `<SignUp />`,
  no site header, no Vertex styling.
- `proxy.ts` — `clerkMiddleware()` with the matcher, `/__clerk/:path*` added.

## Decisions and assumptions

1. **No design reference exists for the auth states.** `design/` holds only
   `vertex-designsystem.png` and `vertex-home.png`, and the home reference shows a single
   avatar glyph with no signed-out variant. So rather than invent a look, the signed-out
   controls reuse the design system's existing button styles verbatim: `Sign in` as
   `tertiary` `md`, `Sign up` as `primary` `md`. This is the smallest choice consistent
   with AGENTS.md section 3.
2. **`UserButton` replaces the placeholder avatar** in the same slot, sized to the
   existing 48px circle via `appearance.elements.avatarBox`. The bell stays presentational
   and visible in both states (AGENTS.md section 7: notifications have no backend).
3. **Modal, not redirect.** `SignInButton` / `SignUpButton` use `mode="modal"` so the
   learner never leaves the page they were browsing. The `/sign-in` and `/sign-up` routes
   stay as working direct-link fallbacks.
4. **`SiteHeader` stays a server component.** All four Clerk components used here are
   server-safe re-exports; no `"use client"` is added.
5. **Auth pages get the site header** and the page's neutral background so they are not a
   bare white Clerk card on an otherwise designed site. Clerk's own card keeps its default
   appearance — theming it is out of scope.

## Files I expect to touch

- `components/site/site-header.tsx` — modify: replace the avatar `<span>` with the
  `Show` / `UserButton` pair and add the signed-out buttons.
- `app/sign-in/[[...sign-in]]/page.tsx` — modify: wrap in site chrome.
- `app/sign-up/[[...sign-up]]/page.tsx` — modify: wrap in site chrome.

No new components, no new dependencies, no barrel changes.

## Requirements

- Signed out: `Sign in` and `Sign up` render in the header's right-hand group, in that
  order, after the bell.
- Signed in: a single `UserButton` renders in that same slot, matching the 48px avatar
  the home reference shows.
- Neither state shifts the header's height or the position of the logo and nav links.
- Buttons reuse `buttonClassName` from `components/ui/button.tsx`; no new colors, radii,
  or spacing values are introduced.
- Keyboard focus is visible on every new control, consistent with the header's existing
  `focusRing`.
- The header remains responsive: at narrow widths the controls stay on the same row as the
  bell and do not overlap the nav, which already wraps to its own row below.
- `/sign-in` and `/sign-up` render the site header above the Clerk card.

## Security considerations

- `CLERK_SECRET_KEY` is server-only and is never imported, referenced, or logged in any
  component this task touches. Only `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` reaches the
  browser, and `ClerkProvider` reads it from env on its own — no key is hardcoded.
- `.env.local` is gitignored and was written by `clerk init`; it is not read, printed, or
  committed. `.env.example` should list the two Clerk variable names by name only — noted
  under "needs your attention" since no `.env.example` exists in the repo yet.
- No route protection is added here, so nothing is accidentally gated or accidentally
  opened. Protection is per-route with `await auth.protect()` when the protected features
  arrive.
- No user data is read, written, or persisted. The Clerk user id is not touched in this
  task.

## Acceptance criteria

1. Visiting `/` signed out shows `Sign in` and `Sign up` in the header; clicking either
   opens Clerk's modal.
2. Completing sign-up leaves the learner on the same page, with the header now showing the
   avatar `UserButton` and no auth buttons.
3. Clicking the avatar opens Clerk's account menu, and `Sign out` returns the header to the
   signed-out state.
4. `/sign-in` and `/sign-up` render with the Vertex header above the Clerk card.
5. The home page's layout above the fold is otherwise pixel-unchanged from
   `design/vertex-home.png` in the signed-in state.
6. No hydration warning or console error in either state.

## Checks to run

- `npx tsc --noEmit` — clean.
- `npm run lint` — no new problems (2 warnings already exist in vendored skill reference
  files under `.agents/` and `agent/`).
- `npm run build` — a production build, since `proxy.ts` and `app/layout.tsx` changed.
- `npm run dev` — exercised by the manual steps below.
- `clerk doctor` — already clean; re-run at the end.

## Manual test steps

1. `npm run dev`, open `http://localhost:3000/` in a private window (signed out).
2. Confirm the header shows the bell, then `Sign in`, then `Sign up`, and that the logo and
   nav sit exactly where `design/vertex-home.png` puts them.
3. Tab through the header and confirm every control shows a visible focus ring.
4. Click `Sign up`, complete the flow with a real address, and confirm the modal closes
   back onto `/` with the avatar now in the header.
5. Click the avatar, confirm the account menu opens, then `Sign out` and confirm the two
   buttons return.
6. Visit `/sign-in` and `/sign-up` directly and confirm each renders under the site header.
7. Narrow the window to ~375px and confirm the controls do not overlap or wrap awkwardly.
