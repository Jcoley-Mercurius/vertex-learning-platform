import {defineField, defineType} from 'sanity'
import {PlayIcon} from '@sanity/icons'

/**
 * One learner's state in one lesson, held inside their `progress` document.
 *
 * The array member's `_key` is the lesson's `_id`, which is what makes a write
 * an in-place patch (`lessons[_key=="<lessonId>"]`) rather than a scan.
 */
export const lessonProgress = defineType({
  name: 'lessonProgress',
  title: 'Lesson progress',
  type: 'object',
  icon: PlayIcon,
  fields: [
    defineField({
      name: 'lesson',
      type: 'reference',
      to: [{type: 'lesson'}],
      readOnly: true,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'completed',
      type: 'boolean',
      initialValue: false,
      readOnly: true,
    }),
    defineField({
      name: 'positionSeconds',
      title: 'Resume position (seconds)',
      description: 'Where the learner left off. Bounded by the lesson duration when written.',
      type: 'number',
      readOnly: true,
      validation: (rule) => rule.min(0),
    }),
    defineField({
      name: 'bookmarked',
      title: 'Bookmarked',
      description: 'The learner saved this lesson for later. Surfaced on My Learning.',
      type: 'boolean',
      initialValue: false,
      readOnly: true,
    }),
    defineField({
      name: 'bookmarkedAt',
      title: 'Bookmarked at',
      description: 'Set on the transition to bookmarked, and cleared when it is removed.',
      type: 'datetime',
      readOnly: true,
    }),
    defineField({
      name: 'note',
      title: 'Personal note',
      description:
        "The learner's own note for this lesson. Plain text app state, not authored content, and capped at 5000 characters by the route that writes it.",
      type: 'text',
      rows: 5,
      readOnly: true,
    }),
    defineField({
      name: 'noteUpdatedAt',
      title: 'Note updated at',
      type: 'datetime',
      readOnly: true,
    }),
    defineField({
      name: 'completedAt',
      type: 'datetime',
      readOnly: true,
    }),
    defineField({
      name: 'updatedAt',
      type: 'datetime',
      readOnly: true,
    }),
  ],
  preview: {
    select: {
      title: 'lesson.title',
      completed: 'completed',
      position: 'positionSeconds',
      bookmarked: 'bookmarked',
      note: 'note',
    },
    prepare: ({title, completed, position, bookmarked, note}) => {
      const state = completed ? 'Completed' : `At ${Math.floor((position ?? 0) / 60)}m`
      const flags = [bookmarked ? 'bookmarked' : null, note ? 'noted' : null].filter(Boolean)

      return {
        title: title || 'Unknown lesson',
        subtitle: flags.length > 0 ? `${state} · ${flags.join(' · ')}` : state,
      }
    },
  },
})
