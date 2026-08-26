import type {StructureResolver} from 'sanity/structure'
import {BookIcon, DocumentVideoIcon, PlayIcon, TagIcon, UserIcon} from '@sanity/icons'

export const structure: StructureResolver = (S) =>
  S.list()
    .title('Vertex')
    .items([
      S.documentTypeListItem('course').title('Courses').icon(BookIcon),
      S.documentTypeListItem('lesson').title('Lessons').icon(PlayIcon),
      S.divider(),
      S.documentTypeListItem('instructor').title('Instructors').icon(UserIcon),
      S.documentTypeListItem('category').title('Categories').icon(TagIcon),
      S.divider(),
      // Built by the ingestion pipeline and read only. Listed last because it is
      // an internal lookup for search, not something an author edits.
      S.documentTypeListItem('video').title('Videos').icon(DocumentVideoIcon),
    ])
