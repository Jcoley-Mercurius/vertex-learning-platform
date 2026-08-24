# PostHog Self-driving setup — Vertex

PostHog Self-driving is now configured for this project. Session Replay, Error Tracking, and Support (Conversations) are all on; six native signal sources plus two Replay Vision scanners and a seven-scout troop are armed. Findings will start appearing in your [Self-driving inbox](https://us.posthog.com/project/573989/inbox) within approximately 30 minutes.

---

## AI data processing

**Approved.** Organization-level AI data processing consent was granted before this run started.

---

## GitHub

**Already connected** — the GitHub App (Jcoley-Mercurius, integration id 245738) was connected before this run. Self-driving can investigate findings in your code and open fix PRs.

---

## Products enabled

| Product | Status | Notes |
|---|---|---|
| Session Replay | **Already enabled** | Server toggle was already on. `posthog.init` has no `disable_session_recording` override — clean. |
| Error Tracking | **Already enabled** | Server toggle was already on. `posthog.init` has `capture_exceptions: true` — correct. |
| Support (Conversations) | **Already enabled** | Server toggle was already on. Tickets reach the inbox only once an inbound channel is connected — see Follow-ups. |

---

## Signal sources

| Source product | Source type | Action |
|---|---|---|
| `health_checks` | `health_issue` | Already enabled |
| `error_tracking` | `issue_created` | Already enabled |
| `error_tracking` | `issue_reopened` | Already enabled |
| `error_tracking` | `issue_spiking` | Already enabled |
| `session_replay` | `session_analysis_cluster` | Already enabled |
| `conversations` | `ticket` | Already enabled |
| `signals_scout` | `cross_source_issue` | On by default — no row needed |
| `replay_vision` | *(any)* | Self-authorizing — scanners set `emits_signals: true` directly (see Replay Vision section) |

---

## Connected tools

No external tools selected. All issue trackers, error trackers, support desks, and other connected-tool sources were skipped (not used).

---

## Scout troop

**7 scouts enabled** (5 canonical + 2 custom). Run budget: **100 runs per day** (early access default), 3 runs used today. Banner: *"Scouts are in early access. Each project gets up to 100 scout runs a day. Contact team-self-driving@posthog.com if you need more."*

### Enabled

| Scout | Watches |
|---|---|
| `signals-scout-general` | Cross-product correlations and surfaces no specialist covers |
| `signals-scout-health-checks` | PostHog setup health issues (proxy gaps, outdated SDKs, missing events) |
| `signals-scout-observability-gaps` | Events with significant volume but no insight, dashboard, or alert coverage |
| `signals-scout-product-analytics` | Funnel/retention regressions in saved product-analytics flows |
| `signals-scout-web-analytics` | Web traffic, per-channel session volume, landing-page health |
| `signals-scout-learning-funnel` *(custom)* | Lesson completion rate regressions, drop-off by course or lesson position |
| `signals-scout-search-engagement` *(custom)* | AI search click-through rate drops, zero-result query clusters |

### Disabled (22 scouts)

| Scout | Reason |
|---|---|
| `signals-scout-error-tracking` | Covered by native error-tracking signal source (step 4) — not a duplicate |
| `signals-scout-session-replay` | Covered by native session-replay signal source (step 4) — not a duplicate |
| `signals-scout-feature-flags` | No active feature flags in use — enable when rollouts begin |
| `signals-scout-experiments` | No running A/B experiments — enable when experiments begin |
| `signals-scout-surveys` | No surveys in use — enable when surveys are added |
| `signals-scout-revenue-analytics` | No payment SDK detected — enable if Stripe or similar is added |
| `signals-scout-ai-observability` | No `$ai_*` events or LLM SDK — enable if LLM observability is added |
| `signals-scout-logs` | PostHog logs product not in use |
| `signals-scout-csp-violations` | No CSP reporting configured |
| `signals-scout-customer-analytics` | Not a B2B / group-analytics product |
| `signals-scout-data-pipelines` | Only GeoIP transformation active — not heavy pipeline use |
| `signals-scout-data-warehouse` | No external warehouse sources connected |
| `signals-scout-replay-vision` | New scanners created this run have no accumulated observations yet — enable after recordings build up |
| `signals-scout-conversations` | Conversations product on but no inbound channel connected yet |
| `signals-scout-anomaly-detection` | No dashboards or saved insights to analyze yet |
| `signals-scout-apm` | No OpenTelemetry/tracing configured |
| `signals-scout-mcp-tool-calls` | No `$mcp_tool_call` telemetry |
| `signals-scout-web-vitals` | No `$web_vitals` events yet — enable once traffic builds |
| `signals-scout-inbox-validation` | No resolved reports to re-validate (fresh setup) |
| `signals-scout-insight-alerts` | No configured alerts yet |
| `signals-scout-skills-store` | Not needed at this stage |
| `signals-scout-tasks` | Not needed at this stage |

---

## Custom scouts

### `signals-scout-learning-funnel`

**Surface:** Lesson completion funnel — the core learning loop of Vertex.

**Discriminator:** `lesson_completed` / `lesson_viewed` ratio (completion rate). A drop in this ratio while view counts hold steady signals friction — a broken video embed, confusing navigation, or a content issue.

**Why no built-in covers it:** `signals-scout-product-analytics` watches saved PostHog funnels, of which there are none yet. This scout watches the raw events directly.

**Explore patterns:** (1) Overall completion rate day-over-day over 14 days. (2) Completion rate by `course_slug`. (3) Drop-off by `lesson_index` position across courses.

**Report threshold:** ≥15 percentage point drop sustained 3+ days; a single course at near-0 rate while others are above 0.5; a >60% completion cliff at a specific lesson position.

**Status:** Created and enabled. The scout will close out empty until `lesson_viewed` and `lesson_completed` events are instrumented (they are in the product spec in AGENTS.md).

**Noise escape hatch:** Set `emit: false` on this scout's config in PostHog to put it in dry-run mode if it becomes noisy.

---

### `signals-scout-search-engagement`

**Surface:** AI-powered search effectiveness — the core discovery surface of Vertex.

**Discriminator:** Click-through rate (CTR) = (`search_result_clicked` or `lesson_opened_from_search`) / `search_performed`. A CTR drop while query volume holds is a signal results aren't matching learner intent — a silent failure no error will catch.

**Why no built-in covers it:** No built-in scout watches search-specific engagement. `signals-scout-general` is too broad to catch this domain pattern.

**Explore patterns:** (1) Daily CTR over 14 days. (2) Zero-result query clusters (queries where `result_count = 0`). (3) Sessions with 2+ searches but zero lesson opens.

**Report threshold:** ≥20 pp CTR drop sustained 3+ days; >20% of searches returning zero results; >30% of multi-search sessions ending with no lesson open.

**Status:** Created and enabled. The scout will close out empty until `search_performed` and search result click events are instrumented (in the product spec in AGENTS.md).

**Noise escape hatch:** Set `emit: false` on this scout's config in PostHog to put it in dry-run mode if it becomes noisy.

---

**Surfaces considered and ruled out:**

| Surface | Filter that ruled it out |
|---|---|
| Video watch depth | Events don't exist yet; no `video_played` or `video_progress` — record as follow-up |
| Instructor page engagement | Shallow surface, covered by `general` + `web-analytics` |
| Learner progress persistence | Backend write path — no event signal; not watchable via analytics |

---

## Replay Vision scanners

Replay Vision scanners are LLMs that watch individual session recordings one at a time on a schedule, write an observation about what they see, and push findings directly to the Self-driving inbox. They catch what events can't: a blank screen, a broken layout, a button that did nothing. Findings arrive at half weight and need corroboration before they're promoted into a full inbox report.

No recordings existed when this run created the scanners — they cost nothing until recordings begin and start working automatically the day they do.

### Scanners created

| Name | Type | Query scope | Sample rate | Est. monthly credits |
|---|---|---|---|---|
| Lesson and search breakage | Monitor | Sessions visiting any URL containing `/courses` | 50% | 0 (no recordings yet) |
| Learner navigation frustration | Monitor | Sessions containing a `$rageclick` event | 100% | 0 (no recordings yet) |

**Lesson and search breakage** — watches for visible product breakage on course and lesson pages: blank video players, empty lesson content, broken curriculum sidebars, failed search result rendering, or lessons unexpectedly gated behind sign-in. URL scope `/courses` covers the catalog, course detail, and lesson pages — the full completion flow.

**Learner navigation frustration** — gated on `$rageclick` events (the frustration signal itself), watches for repeated failed interactions: clicking a video that won't start, hammering a next-lesson button, retrying failed search, or lessons in the curriculum that don't open.

The two scanner queries are disjoint: the breakage monitor owns *where* (URL-scoped), the frustration monitor owns *what they did* (`$rageclick`-gated).

---

## Follow-ups

- [ ] **Connect a Conversations inbound channel** — the Support product is on, but tickets only reach the inbox once you connect an email, inbox, or Slack channel. Go to [PostHog Support settings](https://us.posthog.com/project/573989/settings/environment-integrations) to set one up.
- [ ] **Instrument learning events** — `lesson_viewed`, `lesson_completed`, `video_played`, `video_progress` — so the `signals-scout-learning-funnel` and `signals-scout-search-engagement` scouts have data to watch. These are in the product spec (AGENTS.md) and should be added as the platform builds out.
- [ ] **Instrument search events** — `search_performed`, `search_result_clicked`, `lesson_opened_from_search` (with `result_count` and `search_query` properties) — for the search engagement scout.
- [ ] **Enable `signals-scout-feature-flags`** once you start rolling out features behind flags.
- [ ] **Enable `signals-scout-experiments`** once you run A/B experiments.
- [ ] **Enable `signals-scout-web-vitals`** once traffic builds up and Core Web Vitals data starts flowing (posthog-js with the 2026-01-30 defaults should capture `$web_vitals` automatically).
- [ ] **Enable `signals-scout-replay-vision`** after the Replay Vision scanners accumulate a few weeks of observations — it reads trends across observations, not individual ones.
- [ ] **Consider connecting an issue tracker** (GitHub Issues, Linear, or Jira) in a future setup run — Self-driving can then read open issues and automatically open draft PRs for what it can fix.

---

## What happens next

The scout coordinator picks up the fresh configs within ~30 minutes. Each enabled scout runs once per day (drawing from the 100-run daily budget). Findings cluster into reports in your inbox; immediately actionable ones automatically start coding tasks. Check your inbox here: https://us.posthog.com/project/573989/inbox
