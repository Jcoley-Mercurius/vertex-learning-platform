/**
 * Course glyphs from the home reference. Inline SVG so nothing is fetched at
 * runtime; each mark sits on the 72px square the stacked course card reserves.
 *
 * The reference mixes two treatments and so does this file: a letterform tile
 * (Next.js, TypeScript) where the technology is known by its wordmark, and a
 * full-colour mark on no tile (Docker, Python, PostgreSQL, React) where it is
 * known by its logo. The logo marks are simplified reconstructions, not exact
 * brand assets.
 *
 * Courses with no vendor behind them get a concept mark on a tile, coloured
 * from the palette in `globals.css` rather than an invented one.
 */

const tile = "flex h-full w-full items-center justify-center rounded-lg";

export type CourseGlyphName =
  | "nextjs"
  | "docker"
  | "typescript"
  | "react"
  | "python"
  | "postgres"
  | "llm"
  | "rag"
  | "system-design"
  | "security";

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

/** The atom: a nucleus and three orbits, on React's own dark ground. */
function ReactGlyph() {
  return (
    <span className={`${tile} bg-[#20232A]`}>
      <svg viewBox="0 0 48 48" className="h-4/5 w-4/5" aria-hidden>
        <circle cx="24" cy="24" r="4" fill="#61DAFB" />
        <g fill="none" stroke="#61DAFB" strokeWidth="2">
          <ellipse cx="24" cy="24" rx="19" ry="7.5" />
          <ellipse cx="24" cy="24" rx="19" ry="7.5" transform="rotate(60 24 24)" />
          <ellipse cx="24" cy="24" rx="19" ry="7.5" transform="rotate(120 24 24)" />
        </g>
      </svg>
    </span>
  );
}

/**
 * The two interlocking snakes, simplified to their silhouettes: each is a head
 * with an eye and a body that hooks around the other.
 */
function PythonGlyph() {
  return (
    <svg viewBox="0 0 48 48" className="h-full w-full" aria-hidden>
      <path
        fill="#3776AB"
        d="M23.4 4c-3.3 0-6 .5-7.7 1.5-1.5.8-2.3 2-2.3 3.4v5.2h10.4v1.5H9.5c-2.2 0-4 1.3-5 3.6-1 2.4-1 4.8 0 7.2 1 2.3 2.6 3.6 4.6 3.6h3.5v-6.2c0-2.4 2-4.5 4.6-4.5h10.3c2 0 3.7-1.7 3.7-3.7V8.9c0-2-1.6-3.5-3.7-3.9-1.3-.3-2.7-.4-4.1-.4Zm-5.6 3.2c.9 0 1.6.8 1.6 1.7s-.7 1.6-1.6 1.6c-.9 0-1.6-.7-1.6-1.6s.7-1.7 1.6-1.7Z"
      />
      <path
        fill="#FFD43B"
        d="M24.6 44c3.3 0 6-.5 7.7-1.5 1.5-.8 2.3-2 2.3-3.4v-5.2H24.2v-1.5h14.3c2.2 0 4-1.3 5-3.6 1-2.4 1-4.8 0-7.2-1-2.3-2.6-3.6-4.6-3.6h-3.5v6.2c0 2.4-2 4.5-4.6 4.5H20.5c-2 0-3.7 1.7-3.7 3.7v7.7c0 2 1.6 3.5 3.7 3.9 1.3.3 2.7.4 4.1.4Zm5.6-3.2c-.9 0-1.6-.8-1.6-1.7s.7-1.6 1.6-1.6c.9 0 1.6.7 1.6 1.6s-.7 1.7-1.6 1.7Z"
      />
    </svg>
  );
}

/** The elephant head, simplified to a silhouette with a trunk and an ear. */
function PostgresGlyph() {
  return (
    <svg viewBox="0 0 48 48" className="h-full w-full" aria-hidden>
      <path
        fill="#336791"
        d="M24 5c-7.7 0-14 5.4-14 12.1 0 3.4.7 6.7 2 9.8 1.2 2.9 1.9 6 1.9 9.1 0 1.4.6 2.7 1.7 3.5 1.1.9 2.5 1.2 3.8.9 1.6-.4 2.7-1.8 2.7-3.4v-6.4c0-.6.5-1.1 1.1-1.1h1.6c.6 0 1.1.5 1.1 1.1V37c0 1.7 1.3 3.1 3 3.2 1.7.1 3.2-1.1 3.4-2.8l.9-7.4c.2-1.5.7-2.9 1.5-4.2 1.5-2.4 2.3-5.2 2.3-8 0-6.9-5.9-12.8-13-12.8Z"
      />
      <path
        fill="#fff"
        d="M18.6 16.4c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2Zm10.8 0c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2Z"
      />
      <path
        fill="none"
        stroke="#fff"
        strokeWidth="1.6"
        strokeLinecap="round"
        d="M21.5 25.5c1.6 1 3.4 1 5 0"
      />
    </svg>
  );
}

/** No vendor behind these four, so each is a concept mark on a palette tile. */
function ConceptGlyph({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}) {
  return (
    <span className={`${tile} ${className}`}>
      <svg
        viewBox="0 0 24 24"
        className="h-3/5 w-3/5"
        fill="none"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        {children}
      </svg>
    </span>
  );
}

function LlmGlyph() {
  return (
    <ConceptGlyph className="bg-primary-500">
      <path d="m13 3 1.9 4.6L19.5 9.5 14.9 11.4 13 16l-1.9-4.6L6.5 9.5l4.6-1.9L13 3Z" />
      <path d="m6 15 .9 2.1L9 18l-2.1.9L6 21l-.9-2.1L3 18l2.1-.9L6 15Z" />
    </ConceptGlyph>
  );
}

function RagGlyph() {
  return (
    <ConceptGlyph className="bg-accent-indigo">
      <path d="m12 2 9 4.5-9 4.5-9-4.5L12 2Z" />
      <path d="m3 11.5 5 2.5" />
      <path d="m21 11.5-3 1.5" />
      <circle cx="14" cy="17" r="4" />
      <path d="m17 20 3 3" />
    </ConceptGlyph>
  );
}

function SystemDesignGlyph() {
  return (
    <ConceptGlyph className="bg-neutral-700">
      <circle cx="12" cy="4.5" r="2.5" />
      <circle cx="5" cy="19.5" r="2.5" />
      <circle cx="19" cy="19.5" r="2.5" />
      <path d="M10.5 6.8 6.4 17.2" />
      <path d="m13.5 6.8 4.1 10.4" />
      <path d="M7.5 19.5h9" />
    </ConceptGlyph>
  );
}

function SecurityGlyph() {
  return (
    <ConceptGlyph className="bg-neutral-900">
      <path d="M12 3l7 3v5.5c0 4.3-2.9 8.1-7 9.5-4.1-1.4-7-5.2-7-9.5V6l7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </ConceptGlyph>
  );
}

/**
 * A record rather than an if-chain: the compiler now requires a mark for every
 * member of `CourseGlyphName`, so the union and the artwork cannot drift apart.
 */
const glyphs: Record<CourseGlyphName, () => React.ReactElement> = {
  nextjs: NextGlyph,
  docker: DockerGlyph,
  typescript: TypeScriptGlyph,
  react: ReactGlyph,
  python: PythonGlyph,
  postgres: PostgresGlyph,
  llm: LlmGlyph,
  rag: RagGlyph,
  "system-design": SystemDesignGlyph,
  security: SecurityGlyph,
};

export function CourseGlyph({ name }: { name: CourseGlyphName }) {
  const Glyph = glyphs[name];
  return <Glyph />;
}
