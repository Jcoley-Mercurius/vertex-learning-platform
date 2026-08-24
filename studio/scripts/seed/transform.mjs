/**
 * Reshapes the provided seed into the shape the committed schema expects, and
 * writes the result somewhere else. `seed.ndjson` and `videos.json` are inputs
 * only: this script never writes into its own directory.
 *
 * Three things differ between the seed and `studio/schemaTypes`:
 *   - lessons carry `thumbnail` / `duration`, the schema wants `poster` /
 *     `durationSeconds`, both required;
 *   - courses carry no `glyph`, which the schema requires and the catalog reads;
 *   - course covers point at a random picsum photograph, which has nothing to do
 *     with the course. They are repointed at the generated cover for the course's
 *     own glyph (`covers.mjs`, run with `npm run seed:covers`).
 *
 * Learning-outcome icons used to be remapped here too. They are not any more:
 * the schema and `components/ui/icon.tsx` carry the seed's own eight names, so
 * the script only validates them.
 *
 * Everything else in the seed already validates, so it passes through untouched.
 * Anything unmapped throws rather than sliding into the dataset half-shaped.
 *
 * Usage: node transform.mjs [outFile]
 */
import {existsSync, readFileSync, writeFileSync} from 'node:fs'
import {dirname, resolve} from 'node:path'
import {fileURLToPath, pathToFileURL} from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const seedFile = resolve(here, 'seed.ndjson')
const coversDir = resolve(here, 'covers')
const videosFile = resolve(here, 'videos.json')
const outFile = resolve(process.cwd(), process.argv[2] ?? 'seed.import.ndjson')

if (resolve(dirname(outFile)) === here) {
  throw new Error('Refusing to write into the seed directory. Pass an output path outside it.')
}

/**
 * The icon names `learningOutcome.icon` accepts, mirroring the list in
 * `studio/schemaTypes/objects/learning-outcome.ts` and the keys of `glyphs` in
 * `components/ui/icon.tsx`. Validation only — nothing is translated.
 */
const OUTCOME_ICONS = new Set([
  'target',
  'star',
  'bookmark',
  'clock',
  'file',
  'folder',
  'grid',
  'eye',
  'search',
  'lock',
  'user',
  'bell',
  'accessibility',
  'layers',
  'workflow',
  'gauge',
  'rocket',
  'sparkles',
  'shield',
  'puzzle',
  'code',
])

/**
 * One mark per course. The seed carries no `glyph`, so it is supplied here from
 * the course id rather than derived from anything, and every value must exist in
 * `CourseGlyphName` in `components/site/course-glyph.tsx`.
 */
const COURSE_GLYPHS = {
  'course.nextjs-app-router-in-depth': 'nextjs',
  'course.react-performance-engineering': 'react',
  'course.typescript-for-application-developers': 'typescript',
  'course.building-ai-apps-with-llms': 'llm',
  'course.retrieval-augmented-generation-from-scratch': 'rag',
  'course.python-for-data-work': 'python',
  'course.system-design-foundations': 'system-design',
  'course.postgresql-for-developers': 'postgres',
  'course.devops-with-docker-and-kubernetes': 'docker',
  'course.practical-web-security': 'security',
}

const docs = readFileSync(seedFile, 'utf8')
  .split('\n')
  .filter((line) => line.trim() !== '')
  .map((line, i) => {
    try {
      return JSON.parse(line)
    } catch (cause) {
      throw new Error(`seed.ndjson line ${i + 1} is not valid JSON`, {cause})
    }
  })

/**
 * videos.json is not imported — there is no `video` document type yet, and it
 * carries no chapters or transcript chunks to build one from. It is used here as
 * a cross-check that the lesson set is the one the video metadata describes.
 */
function crossCheckVideos(lessons) {
  const videos = JSON.parse(readFileSync(videosFile, 'utf8'))
  const problems = []

  for (const lesson of lessons) {
    const slug = lesson.slug?.current
    const video = videos[slug]
    if (!video) {
      problems.push(`lesson ${slug} has no videos.json entry`)
      continue
    }
    if (!String(lesson.videoUrl).includes(video.id)) {
      problems.push(`lesson ${slug}: videoUrl does not contain video id ${video.id}`)
    }
    if (lesson.duration !== video.duration) {
      problems.push(`lesson ${slug}: duration ${lesson.duration} != videos.json ${video.duration}`)
    }
  }

  const slugs = new Set(lessons.map((l) => l.slug?.current))
  for (const key of Object.keys(videos)) {
    if (!slugs.has(key)) problems.push(`videos.json key ${key} has no lesson`)
  }

  if (problems.length > 0) {
    throw new Error(`videos.json cross-check failed:\n  ${problems.join('\n  ')}`)
  }
  return Object.keys(videos).length
}

function transformLesson(lesson) {
  const {thumbnail, duration, ...rest} = lesson
  const poster = rest.poster ?? thumbnail
  const durationSeconds = rest.durationSeconds ?? duration

  if (!poster) throw new Error(`lesson ${lesson._id} has no thumbnail or poster`)
  if (!Number.isInteger(durationSeconds) || durationSeconds <= 0) {
    throw new Error(`lesson ${lesson._id} has no positive integer duration`)
  }

  return {...rest, poster, durationSeconds}
}

function transformCourse(course) {
  const mappedGlyph = COURSE_GLYPHS[course._id]
  if (!mappedGlyph) {
    throw new Error(`course ${course._id}: no glyph mapped for this course`)
  }

  if (course.glyph && course.glyph !== mappedGlyph) {
    throw new Error(
      `course ${course._id}: existing glyph "${course.glyph}" differs from mapped value "${mappedGlyph}"`
    )
  }

  for (const outcome of course.learningOutcomes ?? []) {
    if (!OUTCOME_ICONS.has(outcome.icon)) {
      throw new Error(`course ${course._id}: outcome icon "${outcome.icon}" is not in the schema list`)
    }
  }

  return {...course, glyph: mappedGlyph, coverImage: coverFor(course, mappedGlyph)}
}

/**
 * The generated cover for this course's mark. An absolute `file://` URL, because
 * the transformed ndjson is written outside this directory and a relative asset
 * path would be resolved against the wrong place by `sanity dataset import`.
 */
function coverFor(course, glyph) {
  const file = resolve(coversDir, `${glyph}.png`)
  if (!existsSync(file)) {
    throw new Error(
      `course ${course._id}: no cover for glyph "${glyph}". Run \`npm run seed:covers\`.`,
    )
  }

  return {
    ...(course.coverImage ?? {_type: 'image'}),
    _sanityAsset: `image@${pathToFileURL(file).href}`,
  }
}

const lessons = docs.filter((d) => d._type === 'lesson')
const videoCount = crossCheckVideos(lessons)

const out = docs.map((doc) => {
  if (doc._type === 'lesson') return transformLesson(doc)
  if (doc._type === 'course') return transformCourse(doc)
  return doc
})

if (out.length !== docs.length) {
  throw new Error(`document count changed: ${docs.length} in, ${out.length} out`)
}

writeFileSync(outFile, out.map((d) => JSON.stringify(d)).join('\n') + '\n')

const counts = out.reduce((acc, d) => ({...acc, [d._type]: (acc[d._type] ?? 0) + 1}), {})
console.log(`Read     ${docs.length} documents from seed.ndjson`)
console.log(`Verified ${videoCount} videos.json entries against ${lessons.length} lessons`)
console.log(`Wrote    ${out.length} documents to ${outFile}`)
console.log(`Counts   ${JSON.stringify(counts)}`)
