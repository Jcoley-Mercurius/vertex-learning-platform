import {type SchemaTypeDefinition} from 'sanity'

import {category} from './documents/category'
import {course} from './documents/course'
import {instructor} from './documents/instructor'
import {lesson} from './documents/lesson'
import {progress} from './documents/progress'
import {video, videoChapter, videoChunk} from './documents/video'
import {blockContent} from './objects/block-content'
import {courseBookmark} from './objects/course-bookmark'
import {learningOutcome} from './objects/learning-outcome'
import {lessonProgress} from './objects/lesson-progress'
import {module} from './objects/module'
import {resource} from './objects/resource'

export const schema: {types: SchemaTypeDefinition[]} = {
  types: [
    // Documents
    course,
    lesson,
    instructor,
    category,
    video,
    // App state, not content. Deliberately absent from `structure.ts`.
    progress,
    // Objects
    module,
    learningOutcome,
    resource,
    lessonProgress,
    courseBookmark,
    videoChapter,
    videoChunk,
    blockContent,
  ],
}
