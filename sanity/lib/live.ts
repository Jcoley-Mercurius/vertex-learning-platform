import { defineLive } from 'next-sanity/live'

import { client } from './client'
import { readToken } from './token'

/**
 * `serverToken` only. `browserToken` is deliberately omitted so no Sanity token
 * is ever shipped to the browser — the cost is that draft previews are not
 * available, which this project does not use.
 */
export const { sanityFetch, SanityLive } = defineLive({
  client,
  serverToken: readToken,
})
