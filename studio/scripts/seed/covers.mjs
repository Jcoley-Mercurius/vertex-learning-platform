/**
 * Generates the course cover images, one per glyph, into `covers/`.
 *
 * The seed used to point every cover at a random photograph from picsum, which
 * gave Next.js a beach and DevOps a camera. A cover should say which course it
 * belongs to, so each one is drawn here from the same mark and colour the
 * catalog cards and the course hero already use.
 *
 * The geometry is restated in this file rather than imported: the Studio is a
 * standalone workspace and must not reach into the Next.js app (AGENTS.md
 * section 5). The glyph *names* are the shared vocabulary — they must match
 * `CourseGlyphName` in `components/site/course-glyph.tsx` and the values in
 * `COURSE_GLYPHS` in `transform.mjs`.
 *
 * Output is committed, so `npm run seed` never needs to regenerate it.
 *
 * Usage: node covers.mjs
 */
import {mkdirSync, writeFileSync} from 'node:fs'
import {dirname, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

import {Resvg} from '@resvg/resvg-js'

const here = dirname(fileURLToPath(import.meta.url))
const outDir = resolve(here, 'covers')

const WIDTH = 1600
const HEIGHT = 900

/**
 * One cover per glyph: a brand-coloured ground and the mark centred on it.
 *
 * `mark` is drawn in its own 100x100 box and scaled to `markHeight` px, so the
 * artwork below is written at whatever scale reads best and the layout stays
 * one number. `centred()` does the arithmetic: each mark declares the centre of
 * its own artwork, because none of these marks fill their source viewBox evenly.
 */
const covers = {
  nextjs: {
    ground: '#0f172a',
    markHeight: 420,
    mark: letter('N', {family: "'DejaVu Serif', Georgia, serif", size: 86, weight: 500}),
  },
  typescript: {
    ground: '#3178c6',
    markHeight: 300,
    mark: letter('TS', {family: "'DejaVu Sans', Helvetica, sans-serif", size: 46, weight: 700}),
  },
  docker: {
    ground: '#1d63ed',
    markHeight: 340,
    // The container stack and the whale, from the 64x48 mark.
    mark: centred({cx: 34, cy: 23, scale: 1.45}, `
      <g fill="#ffffff">
        <rect x="8" y="20" width="8" height="8" rx="1" />
        <rect x="17" y="20" width="8" height="8" rx="1" />
        <rect x="26" y="20" width="8" height="8" rx="1" />
        <rect x="35" y="20" width="8" height="8" rx="1" />
        <rect x="17" y="11" width="8" height="8" rx="1" />
        <rect x="26" y="11" width="8" height="8" rx="1" />
        <rect x="35" y="11" width="8" height="8" rx="1" />
        <rect x="35" y="2" width="8" height="8" rx="1" />
        <path d="M4 29h44c0 8.5-6.5 15-16 15H19C10.5 44 4 37.5 4 29Z" />
        <path d="M47 25c3.6-3 7.7-2.4 9.7.6C58 21.4 61 20.4 64 21.2c-.7 6.4-5.2 10.4-11 10.4H47Z" />
      </g>`),
  },
  react: {
    ground: '#20232a',
    markHeight: 420,
    // React keeps its own cyan: white would read as a generic mark on this ground.
    mark: centred({cx: 24, cy: 24, scale: 2.0}, `
      <g>
        <circle cx="24" cy="24" r="4" fill="#61dafb" />
        <g fill="none" stroke="#61dafb" stroke-width="2">
          <ellipse cx="24" cy="24" rx="19" ry="7.5" />
          <ellipse cx="24" cy="24" rx="19" ry="7.5" transform="rotate(60 24 24)" />
          <ellipse cx="24" cy="24" rx="19" ry="7.5" transform="rotate(120 24 24)" />
        </g>
      </g>`),
  },
  python: {
    ground: '#2b5c8a',
    markHeight: 400,
    // Both snakes in white; the second at lower opacity so they stay readable
    // as two interlocking bodies rather than one silhouette.
    mark: centred({cx: 24, cy: 24, scale: 2.0}, `
      <g>
        <path fill="#ffffff" d="M23.4 4c-3.3 0-6 .5-7.7 1.5-1.5.8-2.3 2-2.3 3.4v5.2h10.4v1.5H9.5c-2.2 0-4 1.3-5 3.6-1 2.4-1 4.8 0 7.2 1 2.3 2.6 3.6 4.6 3.6h3.5v-6.2c0-2.4 2-4.5 4.6-4.5h10.3c2 0 3.7-1.7 3.7-3.7V8.9c0-2-1.6-3.5-3.7-3.9-1.3-.3-2.7-.4-4.1-.4Zm-5.6 3.2c.9 0 1.6.8 1.6 1.7s-.7 1.6-1.6 1.6c-.9 0-1.6-.7-1.6-1.6s.7-1.7 1.6-1.7Z" />
        <path fill="#ffffff" fill-opacity="0.62" d="M24.6 44c3.3 0 6-.5 7.7-1.5 1.5-.8 2.3-2 2.3-3.4v-5.2H24.2v-1.5h14.3c2.2 0 4-1.3 5-3.6 1-2.4 1-4.8 0-7.2-1-2.3-2.6-3.6-4.6-3.6h-3.5v6.2c0 2.4-2 4.5-4.6 4.5H20.5c-2 0-3.7 1.7-3.7 3.7v7.7c0 2 1.6 3.5 3.7 3.9 1.3.3 2.7.4 4.1.4Zm5.6-3.2c-.9 0-1.6-.8-1.6-1.7s.7-1.6 1.6-1.6c.9 0 1.6.7 1.6 1.6s-.7 1.7-1.6 1.7Z" />
      </g>`),
  },
  postgres: {
    ground: '#336791',
    markHeight: 420,
    // The elephant in white, with the eyes and mouth cut back to the ground so
    // the face still reads without a second colour.
    mark: centred({cx: 23.5, cy: 22.5, scale: 2.1}, `
      <g>
        <path fill="#ffffff" d="M24 5c-7.7 0-14 5.4-14 12.1 0 3.4.7 6.7 2 9.8 1.2 2.9 1.9 6 1.9 9.1 0 1.4.6 2.7 1.7 3.5 1.1.9 2.5 1.2 3.8.9 1.6-.4 2.7-1.8 2.7-3.4v-6.4c0-.6.5-1.1 1.1-1.1h1.6c.6 0 1.1.5 1.1 1.1V37c0 1.7 1.3 3.1 3 3.2 1.7.1 3.2-1.1 3.4-2.8l.9-7.4c.2-1.5.7-2.9 1.5-4.2 1.5-2.4 2.3-5.2 2.3-8 0-6.9-5.9-12.8-13-12.8Z" />
        <path fill="#336791" d="M18.6 16.4c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2Zm10.8 0c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2Z" />
        <path fill="none" stroke="#336791" stroke-width="1.6" stroke-linecap="round" d="M21.5 25.5c1.6 1 3.4 1 5 0" />
      </g>`),
  },
  llm: {ground: '#f97316', markHeight: 380, mark: concept({cx: 11.25, cy: 12}, `
      <path d="m13 3 1.9 4.6L19.5 9.5 14.9 11.4 13 16l-1.9-4.6L6.5 9.5l4.6-1.9L13 3Z" />
      <path d="m6 15 .9 2.1L9 18l-2.1.9L6 21l-.9-2.1L3 18l2.1-.9L6 15Z" />`)},
  rag: {ground: '#4f46e5', markHeight: 380, mark: concept({cx: 12, cy: 12.5}, `
      <path d="m12 2 9 4.5-9 4.5-9-4.5L12 2Z" />
      <path d="m3 11.5 5 2.5" />
      <path d="m21 11.5-3 1.5" />
      <circle cx="14" cy="17" r="4" />
      <path d="m17 20 3 3" />`)},
  'system-design': {ground: '#334155', markHeight: 380, mark: concept({cx: 12, cy: 12}, `
      <circle cx="12" cy="4.5" r="2.5" />
      <circle cx="5" cy="19.5" r="2.5" />
      <circle cx="19" cy="19.5" r="2.5" />
      <path d="M10.5 6.8 6.4 17.2" />
      <path d="m13.5 6.8 4.1 10.4" />
      <path d="M7.5 19.5h9" />`)},
  security: {ground: '#0f172a', markHeight: 380, mark: concept({cx: 12, cy: 11.8}, `
      <path d="M12 3l7 3v5.5c0 4.3-2.9 8.1-7 9.5-4.1-1.4-7-5.2-7-9.5V6l7-3Z" />
      <path d="m9 12 2 2 4-4" />`)},
}

/**
 * A letterform mark. The two wordmark tiles use type, so these two covers depend
 * on a serif and a sans being installed when they are generated — which is why
 * the rendered PNGs are committed rather than built on demand.
 */
function letter(text, {family, size, weight}) {
  return `
      <text x="50" y="50" text-anchor="middle" dominant-baseline="central"
            font-family="${family}" font-size="${size}" font-weight="${weight}"
            fill="#ffffff">${text}</text>`
}

/** The four concept marks: a 24x24 outline stroked in white. */
function concept(centre, paths) {
  return centred({...centre, scale: 3.4}, `
      <g fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round"
         stroke-linejoin="round">
        ${paths}
      </g>`)
}

/** Places artwork so its own centre lands in the middle of the 100x100 mark box. */
function centred({cx, cy, scale}, art) {
  const x = round2(50 - cx * scale)
  const y = round2(50 - cy * scale)
  return `
      <g transform="translate(${x} ${y}) scale(${scale})">${art}
      </g>`
}

function round2(n) {
  return Math.round(n * 100) / 100
}

function coverSvg({ground, mark, markHeight}) {
  const markX = (WIDTH - markHeight) / 2
  const markY = (HEIGHT - markHeight) / 2
  const scale = markHeight / 100

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <radialGradient id="glow" cx="28%" cy="22%" r="78%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.16" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
    </radialGradient>
    <pattern id="hatch" width="26" height="26" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="26" stroke="#ffffff" stroke-opacity="0.05" stroke-width="2" />
    </pattern>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${ground}" />
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#hatch)" />
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow)" />
  <g transform="translate(${markX} ${markY}) scale(${scale})">${mark}
  </g>
</svg>
`
}

mkdirSync(outDir, {recursive: true})

for (const [glyph, cover] of Object.entries(covers)) {
  const png = new Resvg(coverSvg(cover), {
    fitTo: {mode: 'width', value: WIDTH},
    font: {loadSystemFonts: true},
  })
    .render()
    .asPng()

  writeFileSync(resolve(outDir, `${glyph}.png`), png)
  console.log(`Wrote ${glyph}.png (${WIDTH}x${HEIGHT}, ${png.length} bytes)`)
}

console.log(`Wrote ${Object.keys(covers).length} covers to ${outDir}`)
