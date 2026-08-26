# Video ingestion

Builds the `video` documents that search matches a moment against: one per unique
lesson video URL, holding the source's chapter markers and the transcript in short
timestamped chunks (AGENTS.md sections 8 and 9).

Offline tooling. It never runs in the request path.

## Prerequisite

```
pip install --user yt-dlp
```

Set `YT_DLP_PATH` if the binary is not on `PATH` as `yt-dlp` and `python3 -m yt_dlp`
does not resolve.

yt-dlp is what still works. YouTube's `get_transcript` endpoint rejects an
unauthenticated call, and fetching a caption track's `base_url` directly returns
HTTP 200 with an empty body. yt-dlp returns the chapters and the caption inventory
in the same call, so it is one fetch per video for both.

## Run it

```
npm run videos          # ingest, then import
npm run videos:ingest   # write NDJSON only
npm run videos:import   # import the NDJSON that ingest wrote
```

`videos:import` uses `--replace`, so it touches only the video documents in the
file. Course and lesson content is left alone.

## What it does

1. Reads every distinct `lesson.videoUrl` from the dataset with the read token.
2. Fetches each video once with yt-dlp, caching the raw result in `.cache/`
   (gitignored). Re-runs read the cache; `--refresh` bypasses it.
3. Takes the source's chapters as the table of contents. **A video whose source
   has none gets an empty array** — labels are never invented, because clean
   labels are the reason chapters are matched before the transcript.
4. Picks English captions, manual first and auto second, drops the rolling
   `aAppend` duplicates auto captions carry, and merges the cues into chunks of
   about 280 characters or 30 seconds, whichever comes first.
5. Writes sorted NDJSON, so the same input produces a byte-identical file.

A video with no usable English captions is skipped and listed in the summary
rather than written as an empty document, and the run exits non-zero if anything
was skipped.

## Options

```
node scripts/videos/ingest.mjs [outFile] [--refresh] [--only <videoId|url>]...
```

Env comes from `studio/.env.local` (`SANITY_STUDIO_PROJECT_ID`,
`SANITY_STUDIO_DATASET`, `SANITY_API_READ_TOKEN`). The script only reads; the
import step writes, under the Sanity CLI's own auth.
