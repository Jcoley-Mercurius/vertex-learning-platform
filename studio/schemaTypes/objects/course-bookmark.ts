import {defineField, defineType} from 'sanity'
import {BookmarkIcon} from '@sanity/icons'

/**
 * One course a learner saved for later, held inside their `progress` document.
 *
 * A course bookmark is its own thing rather than a flag on a lesson: the course
 * hero's Bookmark saves the whole course, and a course is not any one of its
 * lessons. As with `lessonProgress`, the array member's `_key` is the course's
 * `_id`, which is what makes a write an in-place patch rather than a scan.
 */
export const courseBookmark = defineType({
  name: 'courseBookmark',
  title: 'Course bookmark',
  type: 'object',
  icon: BookmarkIcon,
  fields: [
    defineField({
      name: 'course',
      type: 'reference',
      to: [{type: 'course'}],
      readOnly: true,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'bookmarkedAt',
      type: 'datetime',
      readOnly: true,
    }),
  ],
  preview: {
    select: {title: 'course.title', bookmarkedAt: 'bookmarkedAt'},
    prepare: ({title, bookmarkedAt}) => ({
      title: title || 'Unknown course',
      subtitle: bookmarkedAt ? new Date(bookmarkedAt).toLocaleDateString() : 'Bookmarked',
    }),
  },
})
