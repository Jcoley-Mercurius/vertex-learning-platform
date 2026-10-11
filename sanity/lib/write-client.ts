import 'server-only'
import { createClient } from 'next-sanity'

import { apiVersion, dataset, projectId } from '../env'
import { getWriteToken } from './write-token'

/**
 * The one client in the app that can write, and the one that reads a learner's
 * own progress back (AGENTS.md section 5: any write goes through a server
 * route, and the browser never writes).
 *
 * `useCdn: false` on both counts. A write has to hit the API, and a progress
 * read that came from the CDN could still be the copy from before the learner
 * finished the lesson they are looking at.
 *
 * Only `app/api/progress/route.ts` and the search quota (`lib/search/quota.ts`)
 * may import this.
 */
export function getWriteClient() {
  return createClient({
    projectId,
    dataset,
    apiVersion,
    useCdn: false,
    perspective: 'published',
    token: getWriteToken(),
  })
}
