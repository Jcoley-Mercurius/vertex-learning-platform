import 'server-only'

/**
 * The token behind every write the app makes — today, only learner progress
 * (AGENTS.md sections 5 and 12). It must never reach the browser: the
 * `server-only` import above turns any client import of this module into a
 * build error rather than a leak.
 *
 * It is read lazily rather than at module load, unlike the read token. The read
 * token is needed by every page render, so failing the build without it is
 * right; progress is one route, and a deployment missing this token should fail
 * that route rather than take the whole site down.
 */
export function getWriteToken() {
  const token = process.env.SANITY_API_WRITE_TOKEN

  if (!token) {
    throw new Error('Missing environment variable: SANITY_API_WRITE_TOKEN')
  }

  return token
}
