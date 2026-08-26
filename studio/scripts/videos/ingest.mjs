/**
 * Offline video ingestion (AGENTS.md section 9).
 *
 * Reads every distinct lesson `videoUrl` out of the dataset, fetches each video
 * once, and writes one `video` document per unique URL as NDJSON: the source's
 * chapter markers as a table of contents, and the transcript split into short
 * timestamped chunks. `npm run videos:import` loads the result.
 *
 * This never runs in the request path, and it never writes to the dataset — the
 * import step does, under the Sanity CLI's own auth. The only credential here is
 * the read token.
 *
 * ## Prerequisite
 *
 * `yt-dlp` must be installed:  pip install --user yt-dlp
 *
 * The plain-fetch paths are gone: YouTube's `get_transcript` endpoint rejects an
 * unauthenticated call, and fetching a caption track's `base_url` directly now
 * returns HTTP 200 with an empty body. yt-dlp is what still works, and it also
 * returns the chapter markers, so it is one call per video for both.
 *
 * ## Usage
 *
 *   node ingest.mjs [outFile] [--refresh] [--only <videoId|url>]...
 *
 * Raw yt-dlp output is cached in `.cache/` so re-chunking costs no network.
 * `--refresh` bypasses the cache.
 */
import {spawn} from 'node:child_process'
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs'
import {dirname, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

import {createClient} from '@sanity/client'

const here = dirname(fileURLToPath(import.meta.url))
const cacheDir = resolve(here, '.cache')

/**
 * Chunking. Big enough to carry a matchable concept, small enough that a seek
 * lands on the sentence that says it.
 */
const CHUNK_MAX_CHARS = 280
const CHUNK_MAX_SECONDS = 30

/** yt-dlp is network bound. Four at a time is polite and still quick. */
const CONCURRENCY = 4
const FETCH_TIMEOUT_MS = 120_000

/** Mirrors `YOUTUBE_ID` in the app's `lib/video.ts`. */
const YOUTUBE_ID = /^[A-Za-z0-9_-]{6,20}$/

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})

async function main() {
  const {outFile, refresh, only} = parseArgs(process.argv.slice(2))

  if (resolve(dirname(outFile)) === here) {
    throw new Error('Refusing to write into the script directory. Pass an output path outside it.')
  }

  await assertYtDlp()

  const urls = await fetchLessonVideoUrls()
  console.log(`Found ${urls.length} distinct lesson video URLs.`)

  const targets = []
  const skipped = []

  for (const url of urls) {
    const parsed = parseVideoUrl(url)

    if (!parsed) {
      skipped.push({url, reason: 'unsupported provider or unparseable URL'})
      continue
    }

    if (only.length && !only.includes(parsed.id) && !only.includes(url)) continue

    targets.push({url, ...parsed})
  }

  const documents = []
  let fetched = 0
  let cached = 0

  await inBatches(targets, CONCURRENCY, async (target) => {
    try {
      const raw = await loadRaw(target, refresh)
      raw.fromCache ? (cached += 1) : (fetched += 1)

      const doc = buildDocument(target, raw)

      if (doc.chunks.length === 0) {
        skipped.push({url: target.url, reason: 'no usable English captions'})
        return
      }

      documents.push(doc)
      console.log(
        `  ${target.id}  ${doc.chapters.length} chapters, ${doc.chunks.length} chunks${raw.fromCache ? ' (cached)' : ''}`,
      )
    } catch (error) {
      skipped.push({url: target.url, reason: error instanceof Error ? error.message : String(error)})
    }
  })

  // Sorted so a re-run with the same input produces a byte-identical file.
  documents.sort((a, b) => a._id.localeCompare(b._id))
  writeFileSync(outFile, documents.map((doc) => JSON.stringify(doc)).join('\n') + '\n')

  console.log(`\nWrote ${documents.length} video documents to ${outFile}`)
  console.log(`Fetched ${fetched}, from cache ${cached}.`)

  if (skipped.length) {
    console.log(`\nSkipped ${skipped.length}:`)
    for (const {url, reason} of skipped) console.log(`  ${url} — ${reason}`)
    process.exitCode = 1
  }
}

function parseArgs(argv) {
  let outFile = null
  let refresh = false
  const only = []

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]

    if (arg === '--refresh') refresh = true
    else if (arg === '--only') only.push(argv[(i += 1)])
    else if (!outFile) outFile = arg
    else throw new Error(`Unexpected argument: ${arg}`)
  }

  return {
    outFile: resolve(process.cwd(), outFile ?? 'videos.import.ndjson'),
    refresh,
    only: only.filter(Boolean),
  }
}

/** One clear error rather than a stack trace per video. */
async function assertYtDlp() {
  try {
    await run(ytDlpCommand(['--version']), 15_000)
  } catch {
    throw new Error(
      'yt-dlp is required and was not found. Install it with:  pip install --user yt-dlp',
    )
  }
}

/** Prefers a `yt-dlp` on PATH, falls back to the module. Never a shell string. */
function ytDlpCommand(args) {
  return process.env.YT_DLP_PATH
    ? [process.env.YT_DLP_PATH, args]
    : ['python3', ['-m', 'yt_dlp', ...args]]
}

async function fetchLessonVideoUrls() {
  const projectId = requireEnv('SANITY_STUDIO_PROJECT_ID')
  const dataset = requireEnv('SANITY_STUDIO_DATASET')
  const token = requireEnv('SANITY_API_READ_TOKEN')

  const client = createClient({
    projectId,
    dataset,
    token,
    apiVersion: process.env.SANITY_STUDIO_API_VERSION || '2026-08-23',
    useCdn: false,
    perspective: 'published',
  })

  const urls = await client.fetch(
    `array::unique(*[_type == "lesson" && defined(videoUrl)].videoUrl) | order(@ asc)`,
  )

  return urls ?? []
}

/**
 * yt-dlp's info JSON plus the caption cues, cached on disk. The cache holds the
 * raw source shape, so chunking parameters can change without refetching.
 */
async function loadRaw(target, refresh) {
  const cacheFile = resolve(cacheDir, `${target.id}.json`)

  if (!refresh && existsSync(cacheFile)) {
    return {...JSON.parse(readFileSync(cacheFile, 'utf8')), fromCache: true}
  }

  const info = JSON.parse(
    await run(ytDlpCommand(['--skip-download', '--dump-single-json', target.url]), FETCH_TIMEOUT_MS),
  )

  const trackUrl = pickCaptionTrack(info)
  const cues = trackUrl ? parseJson3(await run(['curl', ['-sSL', trackUrl]], FETCH_TIMEOUT_MS)) : []

  const raw = {
    title: info.title ?? null,
    duration: Number.isFinite(info.duration) ? Math.round(info.duration) : null,
    chapters: (info.chapters ?? []).map((chapter) => ({
      start: chapter.start_time,
      title: chapter.title,
    })),
    cues,
  }

  mkdirSync(cacheDir, {recursive: true})
  writeFileSync(cacheFile, JSON.stringify(raw))

  return {...raw, fromCache: false}
}

/**
 * Manual English captions first, auto second. Auto text is noisier, but it is
 * what most of these videos have, and the chapter markers stay the clean layer.
 */
function pickCaptionTrack(info) {
  const manual = info.subtitles ?? {}
  const auto = info.automatic_captions ?? {}

  const candidates = [
    manual.en,
    ...Object.entries(manual)
      .filter(([lang]) => lang.startsWith('en'))
      .map(([, tracks]) => tracks),
    auto.en,
    auto['en-orig'],
    ...Object.entries(auto)
      .filter(([lang]) => lang.startsWith('en'))
      .map(([, tracks]) => tracks),
  ]

  for (const tracks of candidates) {
    const track = (tracks ?? []).find((candidate) => candidate.ext === 'json3')
    if (track?.url) return track.url
  }

  return null
}

/**
 * json3 cues to `{start, text}`.
 *
 * Auto captions stream a rolling window: every cue repeats the tail of the one
 * before it, flagged `aAppend`. Those are dropped, or the transcript triples in
 * size and every chunk reads as a stutter.
 */
function parseJson3(body) {
  let parsed

  try {
    parsed = JSON.parse(body)
  } catch {
    return []
  }

  const cues = []

  for (const event of parsed.events ?? []) {
    if (event.aAppend === 1 || !event.segs) continue

    const text = normalise(event.segs.map((seg) => seg.utf8 ?? '').join(''))
    if (!text) continue

    cues.push({start: Math.max(0, Math.floor((event.tStartMs ?? 0) / 1000)), text})
  }

  return cues
}

/** Non-breaking spaces, line breaks and runs of whitespace all become one space. */
function normalise(text) {
  return text.replace(/ /g, ' ').replace(/\s+/g, ' ').trim()
}

function buildDocument(target, raw) {
  const duration = raw.duration ?? 0

  return {
    _id: `video.${target.provider}-${target.id}`,
    _type: 'video',
    videoId: target.id,
    provider: target.provider,
    url: target.url,
    title: raw.title ?? undefined,
    durationSeconds: duration || undefined,
    chapters: buildChapters(raw.chapters, duration),
    chunks: buildChunks(raw.cues, duration),
  }
}

/**
 * The source's own chapters, nothing else. A video without them gets an empty
 * array rather than labels synthesised off transcript text — clean labels are
 * the whole reason chapters are matched before the transcript is.
 */
function buildChapters(chapters, duration) {
  const seen = new Set()

  return (chapters ?? [])
    .map((chapter, index) => ({
      _key: `chapter-${index}`,
      startSeconds: clamp(Math.floor(chapter.start ?? 0), duration),
      label: normalise(String(chapter.title ?? '')),
    }))
    .filter((chapter) => {
      if (!chapter.label || seen.has(chapter.startSeconds)) return false
      seen.add(chapter.startSeconds)
      return true
    })
    .sort((a, b) => a.startSeconds - b.startSeconds)
}

/** Cues merged until a chunk hits the character or the span limit. */
function buildChunks(cues, duration) {
  const chunks = []
  let current = null

  for (const cue of cues ?? []) {
    if (
      current &&
      (current.text.length + cue.text.length + 1 > CHUNK_MAX_CHARS ||
        cue.start - current.startSeconds >= CHUNK_MAX_SECONDS)
    ) {
      chunks.push(current)
      current = null
    }

    if (!current) current = {startSeconds: clamp(cue.start, duration), text: cue.text}
    else current.text = `${current.text} ${cue.text}`
  }

  if (current) chunks.push(current)

  return chunks.map((chunk, index) => ({_key: `chunk-${index}`, ...chunk}))
}

function clamp(seconds, duration) {
  const value = Math.max(0, Math.floor(seconds))
  return duration > 0 ? Math.min(value, duration) : value
}

/** Mirrors `parseVideoUrl` in the app's `lib/video.ts`. */
function parseVideoUrl(url) {
  let parsed

  try {
    parsed = new URL(url)
  } catch {
    return null
  }

  const host = parsed.hostname.replace(/^www\./, '')
  let id = null

  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
    id = parsed.searchParams.get('v') ?? parsed.pathname.split('/embed/')[1] ?? null
  } else if (host === 'youtu.be') {
    id = parsed.pathname.slice(1)
  }

  if (!id) return null

  id = id.split('/')[0]

  return YOUTUBE_ID.test(id) ? {provider: 'youtube', id} : null
}

/** Bounded concurrency. One video's failure never aborts the run. */
async function inBatches(items, size, worker) {
  const queue = [...items]

  await Promise.all(
    Array.from({length: Math.min(size, queue.length)}, async () => {
      while (queue.length) await worker(queue.shift())
    }),
  )
}

/** `spawn` with an argument array — a URL from the dataset never becomes a command. */
function run([command, args], timeoutMs) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {stdio: ['ignore', 'pipe', 'pipe']})
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs)
    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (data) => (stdout += data))
    child.stderr.on('data', (data) => (stderr += data))
    child.on('error', (error) => {
      clearTimeout(timer)
      rejectPromise(error)
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (code === 0) resolvePromise(stdout)
      else rejectPromise(new Error(stderr.trim().split('\n').at(-1) || `exited with code ${code}`))
    })
  })
}

function requireEnv(name) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing environment variable: ${name}`)
  return value
}
