import {defineCliConfig} from 'sanity/cli'

/**
 * TypeGen reads the GROQ queries out of the Next.js app next door and writes the
 * generated types back into it, so the two workspaces stay independent while the
 * queries stay typed.
 */
export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID,
    dataset: process.env.SANITY_STUDIO_DATASET,
  },
  typegen: {
    enabled: true,
    path: '../{app,components,sanity}/**/*.{ts,tsx}',
    schema: 'schema.json',
    generates: '../sanity.types.ts',
    overloadClientMethods: true,
  },
})
