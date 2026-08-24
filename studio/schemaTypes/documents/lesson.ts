import {defineArrayMember, defineField, defineType} from 'sanity'
import {PlayIcon} from '@sanity/icons'

import {slugField} from '../shared/slug'

/**
 * A lesson does not store its parent course. The course owns the ordered module
 * list that references lessons, so the frontend derives the course (and the
 * "Lesson 5.1" label) with a reverse reference.
 */
export const lesson = defineType({
  name: 'lesson',
  title: 'Lesson',
  type: 'document',
  icon: PlayIcon,
  groups: [
    {name: 'content', title: 'Content', default: true},
    {name: 'video', title: 'Video'},
    {name: 'extras', title: 'Notes & resources'},
  ],
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      group: 'content',
      validation: (rule) => rule.required(),
    }),
    {...slugField(), group: 'content'},
    defineField({
      name: 'summary',
      description: 'One or two sentences. Used on lesson cards and in search results.',
      type: 'text',
      rows: 3,
      group: 'content',
      validation: (rule) =>
        rule.max(280).warning('Lesson cards clip beyond roughly 280 characters'),
    }),
    defineField({
      name: 'videoUrl',
      title: 'Video URL',
      description: 'A YouTube, Vimeo or Bunny URL. Playback stays on the site as an embed.',
      type: 'url',
      group: 'video',
      validation: (rule) => rule.required().uri({scheme: ['http', 'https']}),
    }),
    defineField({
      name: 'poster',
      title: 'Poster image',
      description: 'Shown on lesson cards and on every video search result.',
      type: 'image',
      options: {hotspot: true},
      group: 'video',
      fields: [
        defineField({
          name: 'alt',
          title: 'Alternative text',
          type: 'string',
          validation: (rule) => rule.required(),
        }),
      ],
      // Nothing derives a thumbnail from the video URL, so a lesson without a
      // poster leaves an empty slot on its cards. `assetRequired` is what
      // catches alt text typed against an image that was never uploaded.
      validation: (rule) => rule.required().assetRequired(),
    }),
    defineField({
      name: 'durationSeconds',
      title: 'Duration (seconds)',
      description: 'Stored in seconds. The frontend formats it, and the video pipeline needs it.',
      type: 'number',
      group: 'video',
      validation: (rule) => rule.required().integer().positive(),
    }),
    defineField({
      name: 'freePreview',
      title: 'Free preview',
      description: 'A label only. It does not gate access.',
      type: 'boolean',
      initialValue: false,
      group: 'content',
    }),
    defineField({
      name: 'studentCount',
      description: 'Display only.',
      type: 'number',
      group: 'content',
      validation: (rule) => rule.integer().min(0),
    }),
    defineField({
      name: 'keyPoints',
      title: 'Key points',
      description: 'The "in this lesson you will" list.',
      type: 'array',
      of: [defineArrayMember({type: 'string'})],
      group: 'extras',
      validation: (rule) =>
        rule.unique().max(6).warning('Six key points is as long as the list should get'),
    }),
    defineField({
      name: 'notes',
      description: 'The lesson write-up shown beside the video.',
      type: 'blockContent',
      group: 'extras',
    }),
    defineField({
      name: 'proTip',
      title: 'Pro tip',
      type: 'text',
      rows: 3,
      group: 'extras',
    }),
    defineField({
      name: 'resources',
      type: 'array',
      of: [defineArrayMember({type: 'resource'})],
      group: 'extras',
    }),
  ],
  preview: {
    select: {title: 'title', media: 'poster', duration: 'durationSeconds'},
    prepare: ({title, media, duration}) => {
      const total = typeof duration === 'number' ? duration : 0
      const minutes = Math.floor(total / 60)
      const seconds = total % 60
      return {
        title: title || 'Untitled lesson',
        subtitle: total ? `${minutes}m ${String(seconds).padStart(2, '0')}s` : 'No duration set',
        media,
      }
    },
  },
})
