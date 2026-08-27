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

/* ---------------------------------------------------------------- progress */

/**
 * A learner's own progress record, by Clerk user id (AGENTS.md section 8).
 *
 * This is app state, not content: it is fetched with the write client
 * (`useCdn: false`) from the progress route only, because a learner who just
 * finished a lesson must not be handed the CDN's copy from before that write.
 *
 * The lesson reference is projected down to its id and slug. Nothing here
 * dereferences notes or video, so the payload stays a few hundred bytes even
 * for a learner who has started every lesson in the catalog.
 */
export const PROGRESS_BY_USER_QUERY = defineQuery(/* groq */ `
  *[_type == "progress" && userId == $userId][0] {
    lastActiveAt,
    notificationsReadAt,
    "lastLessonSlug": lastLesson->slug.current,
    "bookmarkedCourses": bookmarkedCourses[defined(course->_id)] {
      "courseId": course->_id,
      "courseTitle": course->title,
      "courseSlug": course->slug.current,
      bookmarkedAt
    },
    "lessons": lessons[defined(lesson->_id)] {
      "lessonId": lesson->_id,
      "lessonSlug": lesson->slug.current,
      "lessonTitle": lesson->title,
      "lessonDurationSeconds": coalesce(lesson->durationSeconds, 0),
      "completed": coalesce(completed, false),
      "positionSeconds": coalesce(positionSeconds, 0),
      "bookmarked": coalesce(bookmarked, false),
      bookmarkedAt,
      note,
      noteUpdatedAt,
      completedAt,
      updatedAt
    }
  }
`)

/**
 * The My Learning catalog: every course, plus its curriculum flattened to the
 * lesson ids and slugs in order.
 *
 * The page derives everything else — the percentage, which lesson to resume,
 * whether a course is in progress, completed or untouched — by intersecting
 * these ids with the learner's progress. Nothing about a learner is stored on a
 * course, and no percentage is stored anywhere (AGENTS.md section 7).
 */
export const MY_LEARNING_QUERY = defineQuery(/* groq */ `
  *[_type == "course" && defined(slug.current)]
  | order(popular desc, title asc) {
    _id,
    title,
    "slug": slug.current,
    summary,
    glyph,
    level,
    "lessons": modules[].lessons[]-> {
      _id,
      title,
      "slug": slug.current,
      durationSeconds
    },
    ${courseTotalsFragment}
  }
`)

/** Guards a course bookmark write: the course has to exist before it is saved. */
export const COURSE_FOR_BOOKMARK_QUERY = defineQuery(/* groq */ `
  *[_type == "course" && _id == $id][0] {
    _id,
    title
  }
`)

/* ----------------------------------------------------------- notifications */

/**
 * Everything the notification feed needs to derive itself (AGENTS.md section 7:
 * nothing about a learner is stored on a course).
 *
 * No notification is stored anywhere. `GET /api/notifications` intersects this
 * catalog skeleton with the learner's own progress per request, so publishing a
 * course fans out to nobody and there is no feed to keep in sync.
 *
 * `_createdAt` is what makes a course or a lesson "new": the content model has
 * no published-at field, and the seed import is the moment these documents came
 * into existence for this app.
 */
export const NOTIFICATIONS_CATALOG_QUERY = defineQuery(/* groq */ `
  *[_type == "course" && defined(slug.current)] | order(_createdAt desc) [0...40] {
    _id,
    _createdAt,
    title,
    "slug": slug.current,
    glyph,
    "lessons": modules[].lessons[]-> {
      _id,
      _createdAt,
      title,
      "slug": slug.current
    }
  }
`)

/** Guards a progress write: the lesson has to exist, and bounds the position. */
export const LESSON_FOR_PROGRESS_QUERY = defineQuery(/* groq */ `
  *[_type == "lesson" && _id == $id][0] {
    _id,
    title,
    durationSeconds,
    "courseTitle": *[_type == "course" && references(^._id)] | order(_id asc) [0].title
  }
`)

/* ------------------------------------------------------------------ search */

/**
 * Hydrates the lesson ids the search agent ranked. The agent never writes a card
 * field — it returns ids and an ordering, and every fact on the card comes from
 * here (AGENTS.md section 11). An id that does not resolve simply drops out.
 *
 * The whole module skeleton of the owning course comes back so the route can
 * derive the "Lesson 5.1 in Data Fetching and Caching" label; module and lesson
 * numbers are positional, never stored. As on the lesson page, a lesson could be
 * reused across courses, so `order(_id asc)` keeps the pick stable.
 */
export const SEARCH_LESSONS_BY_IDS_QUERY = defineQuery(/* groq */ `
  *[_type == "lesson" && _id in $ids] {
    _id,
    title,
    "slug": slug.current,
    durationSeconds,
    freePreview,
    keyPoints,
    poster { ${imageFragment} },
    "course": *[_type == "course" && references(^._id)] | order(_id asc) [0] {
      _id,
      title,
      "slug": slug.current,
      glyph,
      modules[] {
        _key,
        title,
        "lessonIds": lessons[]._ref
      }
    }
  }
`)

/**
 * The second stage of a search: where inside each matched lesson's video the
 * query is actually taught.
 *
 * A lesson stores no reference to its video, so the join is on the URL. The
 * route resolves the moment from what comes back here — chapters first, the
 * transcript as the fallback (AGENTS.md section 7) — which is what keeps a
 * timestamp on a card a number that exists in the dataset rather than one the
 * model wrote.
 *
 * `chapters` comes back whole because a table of contents is a couple of dozen
 * entries; the transcript never does. `chunks` is filtered inside the array and
 * sliced, because returning it whole would be thousands of lines of speech
 * (AGENTS.md section 12).
 *
 * The six `$t` parameters are the query's keywords, wildcarded. GROQ's `match`
 * ANDs an array of patterns, so an OR has to be spelled out — and a fixed number
 * of slots keeps the query static enough for TypeGen. Unused slots are padded
 * with a pattern that matches nothing.
 */
export const SEARCH_VIDEO_MOMENTS_QUERY = defineQuery(/* groq */ `
  *[_type == "lesson" && _id in $ids] {
    _id,
    durationSeconds,
    "video": *[_type == "video" && url == ^.videoUrl][0] {
      "runtimeSeconds": durationSeconds,
      "chapters": chapters[] { startSeconds, label },
      "matchedChunks": chunks[
        text match $t0 ||
        text match $t1 ||
        text match $t2 ||
        text match $t3 ||
        text match $t4 ||
        text match $t5
      ][0...3] { startSeconds, text }
    }
  }
`)
