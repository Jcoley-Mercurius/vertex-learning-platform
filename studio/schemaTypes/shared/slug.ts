import {defineField, type SlugValidationContext} from 'sanity'

/**
 * Slugs only need to be unique within their own document type — a course and a
 * lesson may both live at `data-fetching` without colliding, because they sit on
 * different routes. Sanity's default `isUnique` checks every type, so we narrow it.
 */
function isUniqueWithinType(slug: string, context: SlugValidationContext) {
  const {document, getClient} = context
  const client = getClient({apiVersion: '2026-08-23'})
  const id = document?._id.replace(/^drafts\./, '')

  return client.fetch<boolean>(
    `!defined(*[_type == $type && !(_id in [$draft, $published]) && slug.current == $slug][0]._id)`,
    {
      type: document?._type,
      draft: `drafts.${id}`,
      published: id,
      slug,
    },
  )
}

/** A required, auto-generated slug sourced from `source` (defaults to `title`). */
export function slugField(source = 'title') {
  return defineField({
    name: 'slug',
    type: 'slug',
    options: {source, maxLength: 96, isUnique: isUniqueWithinType},
    validation: (rule) => rule.required(),
  })
}
