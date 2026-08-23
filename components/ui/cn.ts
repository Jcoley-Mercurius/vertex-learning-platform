/** Join conditional class names. Local helper so we avoid a clsx dependency. */
export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}
