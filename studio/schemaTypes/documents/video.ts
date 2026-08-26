import {defineArrayMember, defineField, defineType} from 'sanity'
import {PlayIcon} from '@sanity/icons'

/**
 * Video intelligence, one document per unique video URL (AGENTS.md sections 8
 * and 9). It carries the table of contents and the transcript split into short
 * timestamped pieces, so search can resolve a query to the second a topic is
 * taught.
 *
 * Two things about this type are deliberate:
 *
 *   - It is written only by the ingestion pipeline (`scripts/videos/ingest.mjs`),
 *     which is why every field is read-only in the Studio. Hand edits would be
 *     overwritten by the next run.
 *   - Lessons link to it by `videoUrl`, not by reference, so the join is
 *     `*[_type == "video" && url == ^.videoUrl][0]`.
 *
 * It is an internal lookup. It is never shown to a learner as a result of its
 * own — a matched moment always surfaces as the lesson that uses the video.
 */
export const video = defineType({
  name: 'video',
  title: 'Video',
  type: 'document',
  icon: PlayIcon,
  description: 'Built by the video ingestion pipeline. Read only.',
  fields: [
    defineField({
      name: 'videoId',
      title: 'Video ID',
      description: "The provider's own id. The document id is derived from it.",
      type: 'string',
      readOnly: true,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'provider',
      description: 'A provider counts as supported once ingestion and playback both exist.',
      type: 'string',
      options: {list: [{title: 'YouTube', value: 'youtube'}]},
      readOnly: true,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'url',
      title: 'Video URL',
      description: 'Matches the `videoUrl` of every lesson that uses this video.',
      type: 'url',
      readOnly: true,
      validation: (rule) => rule.required().uri({scheme: ['http', 'https']}),
    }),
    defineField({
      name: 'title',
      description: "The source's own title. Shown here so the document is identifiable.",
      type: 'string',
      readOnly: true,
    }),
    defineField({
      name: 'durationSeconds',
      title: 'Duration (seconds)',
      description: "The source's runtime. The lesson's own duration stays the one the UI uses.",
      type: 'number',
      readOnly: true,
      validation: (rule) => rule.integer().min(0),
    }),
    defineField({
      name: 'chapters',
      description:
        'The table of contents, as published by the source. Empty when the source has none — labels are never invented, and the transcript is the fallback.',
      type: 'array',
      readOnly: true,
      of: [defineArrayMember({type: 'videoChapter'})],
    }),
    defineField({
      name: 'chunks',
      title: 'Transcript chunks',
      description:
        'The transcript in short timestamped pieces. Never queried whole — a query filters it and takes a few entries.',
      type: 'array',
      readOnly: true,
      of: [defineArrayMember({type: 'videoChunk'})],
      validation: (rule) => rule.required().min(1),
    }),
  ],
  preview: {
    select: {title: 'title', videoId: 'videoId', chunks: 'chunks', chapters: 'chapters'},
    prepare: ({title, videoId, chunks, chapters}) => ({
      title: title || videoId || 'Untitled video',
      subtitle: `${chapters?.length ?? 0} chapters · ${chunks?.length ?? 0} transcript chunks`,
    }),
  },
})

/** One entry in the table of contents. Matched before the transcript is. */
export const videoChapter = defineType({
  name: 'videoChapter',
  title: 'Chapter',
  type: 'object',
  fields: [
    defineField({
      name: 'startSeconds',
      type: 'number',
      readOnly: true,
      validation: (rule) => rule.required().integer().min(0),
    }),
    defineField({
      name: 'label',
      type: 'string',
      readOnly: true,
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: {label: 'label', startSeconds: 'startSeconds'},
    prepare: ({label, startSeconds}) => ({
      title: label || 'Untitled chapter',
      subtitle: formatTimestamp(startSeconds),
    }),
  },
})

/** A short timestamped piece of the transcript. The noisier backstop. */
export const videoChunk = defineType({
  name: 'videoChunk',
  title: 'Transcript chunk',
  type: 'object',
  fields: [
    defineField({
      name: 'startSeconds',
      type: 'number',
      readOnly: true,
      validation: (rule) => rule.required().integer().min(0),
    }),
    defineField({
      name: 'text',
      type: 'text',
      rows: 3,
      readOnly: true,
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: {text: 'text', startSeconds: 'startSeconds'},
    prepare: ({text, startSeconds}) => ({
      title: text || 'Empty chunk',
      subtitle: formatTimestamp(startSeconds),
    }),
  },
})

/** `12:45`, `1:28:00`. Mirrors `formatTimestamp` in the app's `lib/video.ts`. */
function formatTimestamp(value: unknown) {
  const total = typeof value === 'number' ? Math.max(0, Math.floor(value)) : 0
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  const mm = hours > 0 ? String(minutes).padStart(2, '0') : String(minutes)

  return `${hours > 0 ? `${hours}:` : ''}${mm}:${String(seconds).padStart(2, '0')}`
}
