/**
 * Display formatting for values the content model stores raw. Nothing here is
 * stored in Sanity: durations are seconds, the level is a lowercase enum, and
 * module and lesson numbers come from array order (AGENTS.md section 7).
 */

/** `18h 24m`, `1h 12m`, `45m`. Anything under a minute reads as `0m`. */
export function formatDuration(seconds: number | null | undefined) {
  const total = Math.max(0, Math.floor(seconds ?? 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);

  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

const levels: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export function formatLevel(level: string | null | undefined) {
  if (!level) return "";
  return levels[level] ?? level.charAt(0).toUpperCase() + level.slice(1);
}

/** `2.1k`, `18.2k`, `940`. Thousands keep one decimal unless it is a round number. */
export function formatCount(count: number | null | undefined) {
  const value = Math.max(0, Math.floor(count ?? 0));

  if (value < 1000) return String(value);

  const thousands = value / 1000;
  const rounded = Math.round(thousands * 10) / 10;

  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}k`;
}

/** Pluralised counts for the meta rows: `12 modules`, `1 module`. */
export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

/** `Lesson 5.1` — both numbers are 1-based positions in their arrays. */
export function lessonLabel(moduleIndex: number, lessonIndex: number) {
  return `Lesson ${moduleIndex + 1}.${lessonIndex + 1}`;
}
