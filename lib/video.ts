/**
 * Video URLs stored in Sanity are provider watch URLs. Playback stays on the
 * site (AGENTS.md section 7), so the page needs the provider's own embed URL,
 * built here rather than in a component.
 *
 * Only YouTube is supported: a provider counts as supported once ingestion and
 * playback both exist for it (section 9), and only YouTube is seeded. Anything
 * else parses to `null` and the player falls back to the poster.
 */

export type VideoProvider = "youtube";

export type ParsedVideo = {
  provider: VideoProvider;
  id: string;
};

/** YouTube ids are 11 characters today, but the pattern stays tolerant. */
const YOUTUBE_ID = /^[A-Za-z0-9_-]{6,20}$/;

export function parseVideoUrl(url: string | null | undefined): ParsedVideo | null {
  if (!url) return null;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\./, "");
  let id: string | null = null;

  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
    id = parsed.searchParams.get("v") ?? parsed.pathname.split("/embed/")[1] ?? null;
  } else if (host === "youtu.be") {
    id = parsed.pathname.slice(1);
  }

  if (!id) return null;

  // Strip any trailing path segment (`/embed/<id>/something`) before validating,
  // so nothing from the dataset can reach the embed URL unchecked.
  id = id.split("/")[0];

  return YOUTUBE_ID.test(id) ? { provider: "youtube", id } : null;
}

/** `12:45`, `1:28:00`. Used for the resume affordance and player labels. */
export function formatTimestamp(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
    : `${minutes}:${String(secs).padStart(2, "0")}`;
}

/** `?t=` from the URL, coerced and clamped to the lesson's runtime. */
export function startSecondsFromParam(
  value: string | string[] | undefined,
  durationSeconds: number,
) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return 0;

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;

  return durationSeconds > 0 ? Math.min(parsed, durationSeconds) : parsed;
}
