import { createClient } from 'next-sanity'

import { apiVersion, dataset, projectId } from '../env'
import { readToken } from './token'

/**
 * Read-only client for the private dataset.
 *
 * The token has to live on the client itself: `defineLive` only attaches its
 * `serverToken` when the perspective is a draft one, so a published read of a
 * private dataset would otherwise come back empty. It never reaches the browser
 * — `SanityLive` forwards only `browserToken` (deliberately unset in `live.ts`),
 * and `token.ts` is `server-only`, so importing this module from a client
 * component is a build error rather than a leak.
 *
 * Pages are read only; any write goes through a server route.
 */
export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true,
  perspective: 'published',
  token: readToken,
})
