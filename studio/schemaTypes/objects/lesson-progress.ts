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
    select: {title: 'lesson.title', completed: 'completed', position: 'positionSeconds'},
    prepare: ({title, completed, position}) => ({
      title: title || 'Unknown lesson',
      subtitle: completed ? 'Completed' : `At ${Math.floor((position ?? 0) / 60)}m`,
    }),
  },
})
