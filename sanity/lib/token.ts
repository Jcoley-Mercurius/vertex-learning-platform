import 'server-only'

/**
 * The dataset is private, so every read carries this token — and it must never
 * reach the browser. The `server-only` import above turns any client import of
 * this module into a build error rather than a leak.
 */
export const readToken = assertValue(
  process.env.SANITY_API_READ_TOKEN,
  'Missing environment variable: SANITY_API_READ_TOKEN',
)

function assertValue<T>(v: T | undefined, errorMessage: string): T {
  if (v === undefined || v === '') {
    throw new Error(errorMessage)
  }

  return v
}
