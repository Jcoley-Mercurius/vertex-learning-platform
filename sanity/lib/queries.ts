import { defineQuery } from 'next-sanity'

import {
  courseCardFragment,
  courseTotalsFragment,
  imageFragment,
  instructorSummaryFragment,
  lessonCardFragment,
  richTextFragment,
} from './fragments'

/* ------------------------------------------------------------------ courses */

/** The catalog. Popular courses surface first, then alphabetical. */
export const COURSES_CATALOG_QUERY = defineQuery(/* groq */ `
  *[_type == "course" && defined(slug.current)]
  | order(popular desc, title asc) {
    ${courseCardFragment}
  }
`)

/** Slugs for `generateStaticParams` on /courses/[slug]. */
export const COURSE_SLUGS_QUERY = defineQuery(/* groq */ `
  *[_type == "course" && defined(slug.current)].slug.current
`)

/**
 * A single course with its full curriculum. Module and lesson numbers are not
 * stored, so the page derives "Module 5" / "Lesson 5.1" from these array indexes.
 */
export const COURSE_BY_SLUG_QUERY = defineQuery(/* groq */ `
  *[_type == "course" && slug.current == $slug][0] {
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
    category->{ _id, title, "slug": slug.current, description },
    instructor->{
      ${instructorSummaryFragment},
      expertise,
      bio[]{${richTextFragment}}
    },
    learningOutcomes[] {
      _key,
      icon,
      title,
      description
    },
    modules[] {
      _key,
      title,
      summary,
      "lessons": lessons[]->{ ${lessonCardFragment} }
    },
    ${courseTotalsFragment}
  }
`)

export const COURSES_BY_CATEGORY_QUERY = defineQuery(/* groq */ `
  *[_type == "course" && defined(slug.current) && category->slug.current == $slug]
  | order(popular desc, title asc) {
    ${courseCardFragment}
  }
`)

export const COURSES_BY_INSTRUCTOR_QUERY = defineQuery(/* groq */ `
  *[_type == "course" && defined(slug.current) && instructor->slug.current == $slug]
  | order(popular desc, title asc) {
    ${courseCardFragment}
  }
`)

/* ------------------------------------------------------------------ lessons */

export const LESSON_SLUGS_QUERY = defineQuery(/* groq */ `
  *[_type == "lesson" && defined(slug.current)].slug.current
`)

/**
 * A lesson with its notes, plus the course that owns it. A lesson stores no
 * parent, so the course is resolved with a reverse reference. The course's whole
 * module skeleton comes back so the page can derive the lesson label and the
 * previous/next links without a second round trip.
 *
 * Nothing stops a lesson being reused across courses, and an unordered `[0]`
 * would then pick an arbitrary one — so the label, breadcrumbs and navigation
 * could all disagree between requests. Ordering by `_id` makes the pick stable.
 */
export const LESSON_BY_SLUG_QUERY = defineQuery(/* groq */ `
  *[_type == "lesson" && slug.current == $slug][0] {
    _id,
    title,
    "slug": slug.current,
    summary,
    videoUrl,
    durationSeconds,
    freePreview,
    studentCount,
    keyPoints,
    notes[]{${richTextFragment}},
    proTip,
    poster { ${imageFragment} },
    resources[] {
      _key,
      type,
      title,
      description,
      url
    },
    "course": *[_type == "course" && references(^._id)] | order(_id asc) [0] {
      _id,
      title,
      "slug": slug.current,
      glyph,
      level,
      instructor->{ ${instructorSummaryFragment} },
      modules[] {
        _key,
        title,
        "lessons": lessons[]->{
          _id,
          title,
          "slug": slug.current,
          durationSeconds,
          freePreview
        }
      }
    }
  }
`)

/* -------------------------------------------------------------- instructors */

export const INSTRUCTOR_SLUGS_QUERY = defineQuery(/* groq */ `
  *[_type == "instructor" && defined(slug.current)].slug.current
`)

export const INSTRUCTOR_BY_SLUG_QUERY = defineQuery(/* groq */ `
  *[_type == "instructor" && slug.current == $slug][0] {
    ${instructorSummaryFragment},
    expertise,
    bio[]{${richTextFragment}},
    "courses": *[_type == "course" && defined(slug.current) && references(^._id)]
      | order(popular desc, title asc) {
      ${courseCardFragment}
    }
  }
`)

/* --------------------------------------------------------------- categories */

export const CATEGORIES_QUERY = defineQuery(/* groq */ `
  *[_type == "category" && defined(slug.current)] | order(title asc) {
    _id,
    title,
    "slug": slug.current,
    description,
    "courseCount": count(*[_type == "course" && references(^._id)])
  }
`)

export const CATEGORY_SLUGS_QUERY = defineQuery(/* groq */ `
  *[_type == "category" && defined(slug.current)].slug.current
`)
