import {defineArrayMember, defineField, defineType} from 'sanity'
import {UserIcon} from '@sanity/icons'

import {slugField} from '../shared/slug'

export const instructor = defineType({
  name: 'instructor',
  title: 'Instructor',
  type: 'document',
  icon: UserIcon,
  fields: [
    defineField({
      name: 'name',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    slugField('name'),
    defineField({
      name: 'title',
      title: 'Role',
      description: 'Shown under the name, e.g. "Staff Engineer at Vercel".',
      type: 'string',
    }),
    defineField({
      name: 'photo',
      type: 'image',
      options: {hotspot: true},
      fields: [
        defineField({
          name: 'alt',
          title: 'Alternative text',
          type: 'string',
          validation: (rule) => rule.required(),
        }),
      ],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'expertise',
      description: 'Short topic labels shown as tags on the instructor page.',
      type: 'array',
      of: [defineArrayMember({type: 'string'})],
      options: {layout: 'tags'},
      validation: (rule) =>
        rule.unique().max(8).warning('More than eight tags crowds the instructor card'),
    }),
    defineField({
      name: 'bio',
      type: 'blockContent',
    }),
  ],
  preview: {
    select: {title: 'name', subtitle: 'title', media: 'photo'},
  },
})
