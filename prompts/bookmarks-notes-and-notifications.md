# Bookmarks, personal notes, and notifications

## Goal

Give three surfaces that ship today as presentational placeholders a real backend, and add a
notification feed on top of them:

1. **Bookmark a lesson.** The bookmark square in `components/lesson/lesson-hero.tsx` becomes a real
   toggle, and bookmarked lessons get a home on My Learning.
2. **Personal notes.** The `Notes` tab in `components/lesson/lesson-tabs.tsx` becomes an
   autosaving plain-text editor, per learner per lesson.
3. **Notifications.** The header bell in `components/site/site-header.tsx` opens a panel with a
   derived, per-learner feed and an unread count.

AGENTS.md section 7 lists the bell, the Notes tab and the bookmark badge as deliberately
presentational. This request supersedes that for those three; the free preview badge stays a label,
and My Learning stays read-only apart from the new bookmarks section.

## Skills and docs read

- `AGENTS.md` (sections 3, 5, 7, 8, 12, 13) — the server/client boundary, the write-token rule, the
  progress model, and the checks.
- `~/.claude/skills/sanity-best-practices/SKILL.md` — schema definition style, `defineQuery` +
  TypeGen, keyed array patching.
- `node_modules/next/dist/docs/` — App Router route handlers, `"use client"` boundaries, and the
  fact that the lesson/catalog pages must stay prerendered (no session read on the server).
- Clerk: `auth()` in route handlers only; no new middleware matcher is needed (see Security).

## Code inspected

- `studio/schemaTypes/documents/progress.ts`, `studio/schemaTypes/objects/lesson-progress.ts` — the
  learner-state document, `_id = progress.<clerkUserId>`, `_key = <lessonId>` per entry, everything
  `readOnly` in the Studio.
- `app/api/progress/route.ts` — the one write in the app: session-derived id, `strict()` Zod body,
  in-memory rate limit, one `createIfNotExists` + keyed patch transaction.
- `lib/progress.ts`, `lib/progress-server.ts`, `components/progress/progress-provider.tsx` — the
  derived-progress helpers, the server read, and the client provider that overlays marks after
  hydration.
- `sanity/lib/queries.ts` — `PROGRESS_BY_USER_QUERY`, `MY_LEARNING_QUERY`, `LESSON_FOR_PROGRESS_QUERY`.
- `app/my-learning/page.tsx`, `app/lessons/[slug]/page.tsx`, `components/lesson/*`,
  `components/my-learning/*`, `components/ui/*` (existing `bell`, `bookmark`, `check-circle`,
  `play-circle`, `clock`, `file-text`, `star` icons), `proxy.ts`, `lib/analytics.ts`.

## Decisions and assumptions

- **All three features are learner app state, so they live on the existing `progress` document.**
  Bookmarks and notes go on the existing `lessonProgress` array member, keyed by lesson id, which
  means they reuse the upsert transaction, the provider, and the single `GET /api/progress` the
  browser already makes. No new per-learner document type.
- **Notes are plain text, not Portable Text.** AGENTS.md's "content is structured" rule is about
  authored content. A learner's scratch note is app state; a `text` field with a 5 000-character cap
  keeps the payload small and the editor trivial.
- **Notifications are derived, never stored.** No notification documents, no fan-out on publish.
  `GET /api/notifications` computes the feed per request from (a) the learner's progress and (b) a
  small catalog query. The only thing stored is `notificationsReadAt` on the progress document, which
  drives the unread count.
- **Notification kinds** (five, all derived, each with a real timestamp so unread works uniformly):
  | kind | when | timestamp |
  |---|---|---|
  | `new-course` | course `_createdAt` within 30 days and the learner has not started it | `_createdAt` |
  | `new-lessons` | a lesson `_createdAt` within 30 days inside a course the learner has started | lesson `_createdAt` |
  | `resume-course` | a started, unfinished course untouched for 3+ days | that course's latest `updatedAt` |
  | `course-completed` | every lesson in a course complete | latest `completedAt` in the course |
  | `bookmark-reminder` | a lesson bookmarked 3+ days ago and still not completed | `bookmarkedAt` |
  Sorted newest first, capped at 20. Unread = `timestamp > notificationsReadAt`.
- **Signed-out visitors get no feed.** The bell renders, and its panel says "Sign in to see your
  notifications" — the same shape as the rest of the app, where browsing is public and personal
  state is not. No fetch is made without a session.
- **The lesson page stays prerendered.** The bookmark button, the notes editor and the bell are
  client components hydrating on top of the server-rendered zero state, exactly like the existing
  sidebar marks.
- **No new design.** There is no reference image for a notifications panel or a notes editor, so
  both are assembled from the shipped vocabulary (`Card`, `Icon`, `buttonClassName`, `Badge`, the
  neutral/primary scale), the way `/my-learning` was (AGENTS.md section 3). Nothing on the existing
  lesson or header layout moves.

## Files expected to change

**Studio**
- `studio/schemaTypes/objects/lesson-progress.ts` — add `bookmarked` (boolean), `bookmarkedAt`
  (datetime), `note` (text), `noteUpdatedAt` (datetime); all `readOnly`, matching the existing fields.
- `studio/schemaTypes/documents/progress.ts` — add `notificationsReadAt` (datetime, readOnly).
- Regenerate types (`npm run typegen`, which writes `sanity.types.ts` at the web root).

**Web — data**
- `sanity/lib/queries.ts` — extend `PROGRESS_BY_USER_QUERY` with the new fields plus the lesson
  title/slug needed by the bookmarks list; add `NOTIFICATIONS_CATALOG_QUERY` (recent courses and
  recent lessons with `_createdAt`, plus each course's lesson ids for the started/completed test).
- `lib/progress.ts` — extend `LessonProgress` with `bookmarked`, `bookmarkedAt`, `note`,
  `noteUpdatedAt`; extend `ProgressState` with `notificationsReadAt`; add a `bookmarkedLessons()`
  helper. Stays free of `server-only` and React.
- `lib/progress-server.ts` — map the new fields through.
- `lib/notifications.ts` — the `Notification` type, the five derivation rules as one pure
  `deriveNotifications(progress, catalog, now)` function, and `unreadCount()`. Pure and testable, no
  Sanity or Clerk imports.

**Web — API**
- `app/api/progress/route.ts` — accept optional `bookmarked` and `note` in the `strict()` body.
  Important: the handler currently writes a whole entry every time, so it must be changed to merge
  over the previous entry — a note-only or bookmark-only write must not reset `positionSeconds` or
  `completed`. `note` is trimmed and capped at 5 000 chars; `bookmarkedAt` is set on the false→true
  transition only.
- `app/api/notifications/route.ts` — `GET` returns `{ notifications, unreadCount }` (empty for a
  signed-out caller, 200 not 401, matching the progress route's convention); `POST` sets
  `notificationsReadAt = now` on the learner's document. Node runtime; write token via
  `getWriteClient()`; the same rate-limit shape as the progress route.

**Web — UI**
- `components/lesson/bookmark-button.tsx` (new, client) — the existing square, now a toggle reading
  `useProgress()` and calling `save({ lessonId, bookmarked })`; filled icon + `aria-pressed` when
  bookmarked; disabled with a "Sign in to bookmark" title when signed out.
- `components/lesson/lesson-hero.tsx` — takes `lessonId`, renders the new button in place of the
  static one.
- `components/lesson/lesson-notes.tsx` (new, client) — textarea seeded from `useProgress()`,
  autosaving on a 1.5s debounce plus on blur and `pagehide` (`keepalive`), with a quiet
  "Saved"/"Saving…" status and a character counter near the cap. Signed-out state points to sign in.
- `components/lesson/lesson-tabs.tsx` — render `LessonNotes` in the notes panel; takes `lessonId`.
- `components/site/notifications-bell.tsx` (new, client) — bell + unread dot, popover panel
  (Escape closes, outside click closes, `aria-expanded`/`aria-controls`, focus returns to the bell),
  grouped list with icon, title, body, relative time, and a link per item; "Mark all as read"
  action; empty and signed-out states.
- `components/site/site-header.tsx` — swap the static button for `NotificationsBell`.
- `components/my-learning/bookmarked-lessons.tsx` (new) — a "Bookmarked" section on My Learning
  listing bookmarked lessons with course, duration and a link; server-rendered from the progress
  the page already reads.
- `app/my-learning/page.tsx` — render the section; add bookmark and note counts to the summary row
  where they fit.
- `app/lessons/[slug]/page.tsx` — pass `lessonId` to the hero and the tabs.
- Barrels: `components/lesson/index.ts`, `components/site/index.ts`, `components/my-learning/index.ts`.
- `components/progress/progress-provider.tsx` — extend `save()` with the optional `bookmarked` /
  `note` fields and mirror them optimistically; add `markNotificationsRead()`-adjacent state only if
  needed (the bell owns its own fetch, so preferably not).

## Requirements

- Every write goes through a server route with the session as the only source of identity; the
  browser never holds a token and never writes Sanity directly.
- A bookmark or note write must preserve the lesson's existing `positionSeconds`, `completed` and
  `completedAt`.
- Notes cap at 5 000 characters, enforced in Zod on the server and in the textarea on the client.
- Notification derivation is pure and grounded: nothing invented, every item points at a real course
  or lesson that resolves.
- No page that is prerendered today becomes dynamic. Only `/my-learning` reads the session on the
  server.
- Keyboard and screen-reader access on the panel and the toggle: `aria-pressed` on the bookmark,
  `aria-expanded` + Escape + focus return on the panel, a labelled textarea with a live status region.
- Responsive down to mobile: the panel becomes a full-width sheet under the header rather than a
  narrow popover.
- PostHog events: `lesson_bookmarked` / `lesson_unbookmarked`, `lesson_note_saved` (with a length
  bucket, never the note text), `notifications_opened` (with `unread_count`), `notification_clicked`
  (with `kind`), `notifications_marked_read`. Note text and bookmark titles are never sent as
  free text beyond what is already captured.

## Security considerations

- `userId` comes from `auth()`, never from the body; the document id stays `progress.<userId>`.
- Both routes keep `strict()` Zod bodies, so an unexpected key is a 400, not a silent patch.
- The Sanity write token stays behind `server-only` `sanity/lib/write-client.ts`; `runtime = "nodejs"`.
- `GET /api/notifications` can only ever return the caller's own feed; there is no id parameter.
- Note text is stored as-is and rendered as text (never `dangerouslySetInnerHTML`, never Portable
  Text), so there is no injection surface; it is trimmed and length-capped before the write.
- Rate limiting on both routes; the notes editor debounces so a typing learner makes ~1 write per
  1.5s idle, well inside the existing 30/min budget.
- `progress` stays outside the search agent's content filter, so notes and bookmarks can never
  surface in a search result.
- No new environment variables.

## Acceptance criteria

1. Bookmarking a lesson persists across a reload and across devices for the same Clerk user.
2. A note typed on a lesson is there after a reload; a second learner sees their own note, not the
   first learner's.
3. Saving a note does not reset the resume position or a completion mark on that lesson.
4. The bell shows an unread dot when there are unread notifications; "Mark all as read" clears it and
   it stays clear after a reload.
5. Each notification kind can be produced with real data, and every item links somewhere real.
6. A signed-out visitor sees the bell and the bookmark square, gets a sign-in prompt from each, and
   triggers no `/api/notifications` fetch.
7. `/courses`, `/courses/[slug]` and `/lessons/[slug]` are still prerendered in the build output.
8. Type check, lint and production build pass.

## Checks to run

- Web: `npx tsc --noEmit`, `npm run lint`, `npm run build` (routes, server modules and config change),
  `npm run dev` for the manual pass.
- Studio: `npm --prefix studio run typegen`, then `npm --prefix studio run schema:deploy` and
  `npm --prefix studio run deploy` so the deployed schema and Studio stay in step with the local one
  (AGENTS.md sections 12 and 13).
- No search or ingestion code changes, so no live MCP verification is needed.

## Manual test steps

1. `npm run dev`, sign in.
2. Open any lesson. Click the bookmark square — it fills. Reload: still filled. Click again: clears.
3. Open the `Notes` tab, type a paragraph, wait ~2s for "Saved", reload the page, and confirm the
   text is back on the Notes tab.
4. Play ~30s of the video, then edit the note again. Reload and confirm the player still resumes at
   ~30s (the note write did not clobber the position).
5. Go to `/my-learning` and confirm the bookmarked lesson appears under "Bookmarked" with its course
   and duration, and that its link opens the lesson.
6. Open the bell. Confirm items appear for: a course you have never started (new course), a course
   you started days ago (resume), a course you finished (completed), and the lesson you bookmarked
   (bookmark reminder). Click one and confirm it navigates.
7. Click "Mark all as read", confirm the dot clears, reload, and confirm it stays clear.
8. Sign out. Confirm the bell opens a sign-in prompt, the bookmark square prompts to sign in, the
   Notes tab prompts to sign in, and the Network tab shows no `/api/notifications` request.
9. Narrow the window to ~390px and confirm the panel, the notes editor and the bookmarks section all
   read correctly.
10. In PostHog live events, confirm `lesson_bookmarked`, `lesson_note_saved`, `notifications_opened`
    and `notifications_marked_read` arrive with the expected properties and no note text.
