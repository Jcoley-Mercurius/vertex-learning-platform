import { createClient } from 'next-sanity'

import { apiVersion, dataset, projectId } from '../env'

/**
 * Read-only client for the private dataset. It carries no token on its own —
 * `live.ts` attaches the server token, so nothing here can leak into a client
 * bundle. Pages are read only; any write goes through a server route.
 */
export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true,
  perspective: 'published',
})
