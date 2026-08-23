/**
 * Studio environment. Sanity's CLI only exposes variables prefixed with
 * `SANITY_STUDIO_` to the browser bundle, so those are the names used here.
 */
export const apiVersion = process.env.SANITY_STUDIO_API_VERSION || '2026-08-23'

export const dataset = assertValue(
  process.env.SANITY_STUDIO_DATASET,
  'Missing environment variable: SANITY_STUDIO_DATASET',
)

export const projectId = assertValue(
  process.env.SANITY_STUDIO_PROJECT_ID,
  'Missing environment variable: SANITY_STUDIO_PROJECT_ID',
)

function assertValue<T>(v: T | undefined, errorMessage: string): T {
  if (v === undefined) {
    throw new Error(errorMessage)
  }

  return v
}
