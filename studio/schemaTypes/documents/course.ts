import {defineArrayMember, defineField, defineType} from 'sanity'
import {BookIcon} from '@sanity/icons'

import {slugField} from '../shared/slug'

/**
 * The top level of the content model. Everything the UI numbers ("Module 5",
 * "12 modules", a total runtime) is derived from the modules array, so none of
 * it is stored here.
 */
export const course = defineType({
  name: 'course',
  title: 'Course',
  type: 'document',
  icon: BookIcon,
  groups: [
    {name: 'content', title: 'Content', default: true},
    {name: 'marketing', title: 'Marketing'},
    {name: 'curriculum', title: 'Curriculum'},
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
      type: 'text',
      rows: 3,
      group: 'content',
      validation: (rule) =>
        rule.required().max(280).warning('Course cards clip beyond roughly 280 characters'),
    }),
    defineField({
      name: 'instructor',
      type: 'reference',
      to: [{type: 'instructor'}],
      group: 'content',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'category',
      type: 'reference',
      to: [{type: 'category'}],
      group: 'content',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'coverImage',
      type: 'image',
      options: {hotspot: true},
      group: 'marketing',
      fields: [
        defineField({
          name: 'alt',
          title: 'Alternative text',
          type: 'string',
          validation: (rule) => rule.required(),
        }),
      ],
    }),
    defineField({
      name: 'glyph',
      title: 'Course glyph',
      description: 'The mark shown beside the course name on cards and search results.',
      type: 'string',
      group: 'marketing',
      options: {
        list: [
          {title: 'Next.js', value: 'nextjs'},
          {title: 'Docker', value: 'docker'},
          {title: 'TypeScript', value: 'typescript'},
        ],
        layout: 'radio',
      },
      initialValue: 'nextjs',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'level',
      type: 'string',
      group: 'marketing',
      options: {
        list: [
          {title: 'Beginner', value: 'beginner'},
          {title: 'Intermediate', value: 'intermediate'},
          {title: 'Advanced', value: 'advanced'},
        ],
        layout: 'radio',
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'price',
      description: 'In whole currency units. Zero means free.',
      type: 'number',
      group: 'marketing',
      validation: (rule) => rule.required().min(0),
    }),
    defineField({
      name: 'popular',
      description: 'Display only. Surfaces the course first in the catalog.',
      type: 'boolean',
      initialValue: false,
      group: 'marketing',
    }),
    defineField({
      name: 'studentCount',
      description: 'Display only.',
      type: 'number',
      group: 'marketing',
      validation: (rule) => rule.integer().min(0),
    }),
    defineField({
      name: 'learningOutcomes',
      title: "What you'll learn",
      type: 'array',
      of: [defineArrayMember({type: 'learningOutcome'})],
      group: 'marketing',
      validation: (rule) =>
        rule.max(6).warning('The outcomes grid is designed for up to six entries'),
    }),
    defineField({
      name: 'modules',
      type: 'array',
      of: [defineArrayMember({type: 'module'})],
      group: 'curriculum',
      validation: (rule) => rule.min(1).error('A course needs at least one module'),
    }),
  ],
  preview: {
    select: {
      title: 'title',
      media: 'coverImage',
      instructor: 'instructor.name',
      modules: 'modules',
    },
    prepare: ({title, media, instructor, modules}) => {
      const count = Array.isArray(modules) ? modules.length : 0
      return {
        title: title || 'Untitled course',
        subtitle: [instructor, `${count} ${count === 1 ? 'module' : 'modules'}`]
          .filter(Boolean)
          .join(' · '),
        media,
      }
    },
  },
})
