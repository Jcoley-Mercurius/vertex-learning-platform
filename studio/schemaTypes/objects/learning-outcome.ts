import {defineField, defineType} from 'sanity'
import {TargetIcon} from '@sanity/icons'

/**
 * One row of the course's "what you'll learn" section. `icon` is constrained to
 * the glyphs the web app's Icon component can actually render.
 */
export const learningOutcome = defineType({
  name: 'learningOutcome',
  title: 'Learning outcome',
  type: 'object',
  icon: TargetIcon,
  fields: [
    defineField({
      name: 'icon',
      type: 'string',
      options: {
        list: [
          {title: 'Target', value: 'target'},
          {title: 'Star', value: 'star'},
          {title: 'Bookmark', value: 'bookmark'},
          {title: 'Clock', value: 'clock'},
          {title: 'File', value: 'file'},
          {title: 'Folder', value: 'folder'},
          {title: 'Grid', value: 'grid'},
          {title: 'Eye', value: 'eye'},
          {title: 'Search', value: 'search'},
          {title: 'Lock', value: 'lock'},
          {title: 'User', value: 'user'},
          {title: 'Bell', value: 'bell'},
          {title: 'Accessibility', value: 'accessibility'},
          {title: 'Layers', value: 'layers'},
          {title: 'Workflow', value: 'workflow'},
          {title: 'Gauge', value: 'gauge'},
          {title: 'Rocket', value: 'rocket'},
          {title: 'Sparkles', value: 'sparkles'},
          {title: 'Shield', value: 'shield'},
          {title: 'Puzzle', value: 'puzzle'},
          {title: 'Code', value: 'code'},
        ],
      },
      initialValue: 'target',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'title',
      type: 'string',
      validation: (rule) => rule.required().max(80),
    }),
    defineField({
      name: 'description',
      type: 'text',
      rows: 2,
      validation: (rule) =>
        rule.max(180).warning('Keep outcomes to a sentence so the grid stays even'),
    }),
  ],
  preview: {
    select: {title: 'title', subtitle: 'description'},
  },
})
