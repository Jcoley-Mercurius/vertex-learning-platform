/**
 * Course glyphs from the home reference. Inline SVG so nothing is fetched at
 * runtime; each mark sits on the 72px square the stacked course card reserves.
 */

const tile = "flex h-full w-full items-center justify-center rounded-lg";

export type CourseGlyphName = "nextjs" | "docker" | "typescript";

function NextGlyph() {
  return (
    <span className={`${tile} bg-neutral-900`}>
      <span className="font-display text-[2.25rem] leading-none font-medium text-white">
        N
      </span>
    </span>
  );
}

function TypeScriptGlyph() {
  return (
    <span className={`${tile} bg-[#3178C6]`}>
      <span className="text-heading-1 leading-none font-bold text-white">TS</span>
    </span>
  );
}

function DockerGlyph() {
  return (
    <svg
      viewBox="0 0 64 48"
      className="h-full w-full"
      fill="#2496ED"
      aria-hidden
    >
      <g>
        <rect x="8" y="20" width="8" height="8" rx="1" />
        <rect x="17" y="20" width="8" height="8" rx="1" />
        <rect x="26" y="20" width="8" height="8" rx="1" />
        <rect x="35" y="20" width="8" height="8" rx="1" />
        <rect x="17" y="11" width="8" height="8" rx="1" />
        <rect x="26" y="11" width="8" height="8" rx="1" />
        <rect x="35" y="11" width="8" height="8" rx="1" />
        <rect x="35" y="2" width="8" height="8" rx="1" />
      </g>
      <path d="M4 29h44c0 8.5-6.5 15-16 15H19C10.5 44 4 37.5 4 29Z" />
      <path d="M47 25c3.6-3 7.7-2.4 9.7.6C58 21.4 61 20.4 64 21.2c-.7 6.4-5.2 10.4-11 10.4H47Z" />
    </svg>
  );
}

export function CourseGlyph({ name }: { name: CourseGlyphName }) {
  if (name === "nextjs") return <NextGlyph />;
  if (name === "typescript") return <TypeScriptGlyph />;
  return <DockerGlyph />;
}
