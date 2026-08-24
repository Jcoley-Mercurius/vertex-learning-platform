/**
 * Shared GROQ projections. These are plain strings interpolated into the queries
 * in `queries.ts` — keeping them here stops the same projection drifting between
 * the catalog, the course page and the lesson page.
 */

/**
 * An image ready for `urlFor()`. The spread keeps `hotspot` and `crop`, and the
 * expanded asset carries the LQIP placeholder and intrinsic dimensions.
 */
export const imageFragment = /* groq */ `
  ...,
  asset->{
    _id,
    url,
    metadata { lqip, dimensions }
  }
`

/** Everything a lesson card needs, and nothing that could pull in notes. */
export const lessonCardFragment = /* groq */ `
  _id,
  title,
  "slug": slug.current,
  summary,
  durationSeconds,
  freePreview,
  studentCount,
  poster { ${imageFragment} }
`

/** The instructor as shown beside a course or a lesson. */
export const instructorSummaryFragment = /* groq */ `
  _id,
  name,
  "slug": slug.current,
  title,
  photo { ${imageFragment} }
`

/**
 * Counts and total runtime derived from the curriculum. Nothing here is stored:
 * module and lesson numbering come from array order (AGENTS.md section 7).
 */
export const courseTotalsFragment = /* groq */ `
  "moduleCount": coalesce(count(modules), 0),
  "lessonCount": coalesce(count(modules[].lessons[]), 0),
  "durationSeconds": coalesce(math::sum(modules[].lessons[]->durationSeconds), 0)
`

/** Everything a course card needs on the catalog and on listing pages. */
export const courseCardFragment = /* groq */ `
  _id,
  title,
  "slug": slug.current,
  summary,
  glyph,
  level,
  price,
  popular,
  studentCount,
  coverImage { ${imageFragment} },
  category->{ _id, title, "slug": slug.current },
  instructor->{ ${instructorSummaryFragment} },
  ${courseTotalsFragment}
`
