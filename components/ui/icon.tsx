import type { SVGProps } from "react";
import { cn } from "./cn";

/**
 * Icon specs from the design system: 24x24 grid, 2px stroke width (outline),
 * rounded line caps, consistent optical balance.
 */

type IconGlyph = {
  outline: React.ReactNode;
  /** Solid form. When absent, the filled style renders the outline at a heavier stroke. */
  filled?: React.ReactNode;
};

const glyphs = {
  bell: {
    outline: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </>
    ),
    filled: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9Z" />
        <path d="M10.27 21a2 2 0 0 0 3.46 0Z" />
      </>
    ),
  },
  search: {
    outline: (
      <>
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </>
    ),
  },
  "play-circle": {
    outline: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="m10 8 6 4-6 4z" />
      </>
    ),
    filled: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="m10 8 6 4-6 4z" fill="#fff" stroke="none" />
      </>
    ),
  },
  "file-text": {
    outline: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M16 13H8" />
        <path d="M16 17H8" />
        <path d="M10 9H8" />
      </>
    ),
    filled: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M16 13H8M16 17H8M10 9H8" stroke="#fff" strokeWidth="2" />
      </>
    ),
  },
  bookmark: {
    outline: <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />,
    filled: <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />,
  },
  "bar-chart": {
    outline: (
      <>
        <path d="M6 20v-5" />
        <path d="M12 20V9" />
        <path d="M18 20V4" />
      </>
    ),
    filled: (
      <>
        <rect x="4" y="14" width="4" height="6" rx="1" />
        <rect x="10" y="9" width="4" height="11" rx="1" />
        <rect x="16" y="4" width="4" height="16" rx="1" />
      </>
    ),
  },
  clock: {
    outline: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </>
    ),
    filled: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" stroke="#fff" strokeWidth="2" fill="none" />
      </>
    ),
  },
  user: {
    outline: (
      <>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </>
    ),
    filled: (
      <>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2z" />
        <circle cx="12" cy="7" r="4" />
      </>
    ),
  },
  "chevron-right": { outline: <path d="m9 18 6-6-6-6" /> },
  "chevron-left": { outline: <path d="m15 18-6-6 6-6" /> },
  "chevron-down": { outline: <path d="m6 9 6 6 6-6" /> },
  "external-link": {
    outline: (
      <>
        <path d="M15 3h6v6" />
        <path d="M10 14 21 3" />
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      </>
    ),
  },
  "check-circle": {
    outline: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
  },
  lock: {
    outline: (
      <>
        <rect x="4" y="11" width="16" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </>
    ),
  },
  folder: {
    outline: (
      <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z" />
    ),
  },
  "loader-circle": {
    outline: <path d="M21 12a9 9 0 1 1-6.219-8.56" />,
  },
  eye: {
    outline: (
      <>
        <path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
  },
  grid: {
    outline: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
  },
  target: {
    outline: (
      <>
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </>
    ),
  },
  accessibility: {
    outline: (
      <>
        <circle cx="12" cy="4" r="2" />
        <path d="M12 7v6" />
        <path d="M7 9h10" />
        <path d="m8.5 21 3.5-8 3.5 8" />
      </>
    ),
  },
} satisfies Record<string, IconGlyph>;

export type IconName = keyof typeof glyphs;

const glyphMap: Record<IconName, IconGlyph> = glyphs;

export const iconNames = Object.keys(glyphs) as IconName[];

export type IconProps = Omit<SVGProps<SVGSVGElement>, "name"> & {
  name: IconName;
  variant?: "outline" | "filled";
  /** Rendered size in px on the 24x24 grid. */
  size?: number;
  /** Accessible label. Without one the icon is hidden from assistive tech. */
  title?: string;
};

export function Icon({
  name,
  variant = "outline",
  size = 24,
  title,
  className,
  ...props
}: IconProps) {
  const glyph = glyphMap[name];
  const solid = variant === "filled" && glyph.filled !== undefined;

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={solid ? "currentColor" : "none"}
      stroke={solid ? "none" : "currentColor"}
      strokeWidth={variant === "filled" ? 3 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("shrink-0", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      {...props}
    >
      {solid ? glyph.filled : glyph.outline}
    </svg>
  );
}
