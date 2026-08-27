import {defineArrayMember, defineField, defineType} from 'sanity'
import {UserIcon} from '@sanity/icons'

/**
 * A learner's progress, one document per person, keyed by their Clerk user id
 * (AGENTS.md sections 5, 7 and 8).
 *
 * Three things about this type are deliberate:
 *
 *   - It is **app state, not content**. It is not listed in `structure.ts`, so
 *     it never appears in the authoring desk, and it is outside the search
 *     agent's content filter, so a learner's state can never surface in a
 *     search result.
 *   - It is written **only** by the `/api/progress` route with the server-side
 *     write token. Every field is read-only here: a hand edit in the Studio
 *     would be silently overwritten by the learner's next write.
 *   - Its `_id` is `progress.<clerkUserId>`, the one place in this schema where
 *     an id is derived rather than generated. A learner's record is a singleton
 *     per person, and a deterministic id is what lets the route upsert it in a
 *     single transaction — no read-then-write race, and no way to end up with
 *     two records for one learner.
 */
export const progress = defineType({
  name: 'progress',
  title: 'Learner progress',
  type: 'document',
  icon: UserIcon,
  description: 'Written by the app, never by hand. Keyed by the Clerk user id.',
  readOnly: true,
  fields: [
    defineField({
      name: 'userId',
      title: 'Clerk user ID',
      description: 'Clerk is the system of record for the person; this is only the key.',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'lessons',
      description: 'One entry per lesson the learner has started. `_key` is the lesson id.',
      type: 'array',
      of: [defineArrayMember({type: 'lessonProgress'})],
    }),
    defineField({
      name: 'lastLesson',
      title: 'Last lesson',
      description: 'Where the learner was most recently. Drives the resume affordance.',
      type: 'reference',
      to: [{type: 'lesson'}],
    }),
    defineField({
      name: 'lastActiveAt',
      type: 'datetime',
    }),
  ],
  preview: {
    select: {userId: 'userId', lessons: 'lessons', lastActiveAt: 'lastActiveAt'},
    prepare: ({userId, lessons, lastActiveAt}) => {
      const started = Array.isArray(lessons) ? lessons.length : 0
      const when = lastActiveAt ? new Date(lastActiveAt).toLocaleDateString() : 'never'
      return {
        title: userId || 'Unknown learner',
        subtitle: `${started} lesson${started === 1 ? '' : 's'} started · active ${when}`,
      }
    },
  },
})
