import {defineArrayMember, defineField, defineType} from 'sanity'
import {ImageIcon} from '@sanity/icons'

/**
 * Rich text for lesson notes and instructor bios. Content is structured, never
 * markdown — markdown only ever shows up in what the search agent replies.
 */
export const blockContent = defineType({
  name: 'blockContent',
  title: 'Rich text',
  type: 'array',
  of: [
    defineArrayMember({
      type: 'block',
      styles: [
        {title: 'Normal', value: 'normal'},
        {title: 'Heading', value: 'h2'},
        {title: 'Subheading', value: 'h3'},
        {title: 'Quote', value: 'blockquote'},
      ],
      lists: [
        {title: 'Bullet', value: 'bullet'},
        {title: 'Numbered', value: 'number'},
      ],
      marks: {
        decorators: [
          {title: 'Strong', value: 'strong'},
          {title: 'Emphasis', value: 'em'},
          {title: 'Code', value: 'code'},
        ],
        annotations: [
          defineArrayMember({
            name: 'link',
            title: 'Link',
            type: 'object',
            fields: [
              defineField({
                name: 'href',
                title: 'URL',
                type: 'url',
                validation: (rule) =>
                  rule.required().uri({scheme: ['http', 'https', 'mailto']}),
              }),
            ],
          }),
        ],
      },
    }),
    defineArrayMember({
      type: 'image',
      icon: ImageIcon,
      options: {hotspot: true},
      fields: [
        defineField({
          name: 'alt',
          title: 'Alternative text',
          type: 'string',
          validation: (rule) => rule.required(),
        }),
      ],
    }),
    defineArrayMember({
      name: 'codeBlock',
      title: 'Code',
      type: 'object',
      fields: [
        defineField({name: 'language', type: 'string'}),
        defineField({
          name: 'code',
          type: 'text',
          rows: 8,
          validation: (rule) => rule.required(),
        }),
      ],
      preview: {
        select: {language: 'language', code: 'code'},
        prepare: ({language, code}) => ({
          title: code?.split('\n')[0] ?? 'Code',
          subtitle: language ?? 'Code block',
        }),
      },
    }),
  ],
})
