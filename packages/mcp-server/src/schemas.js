import { z } from 'zod'

export const projectId = z
  .string()
  .regex(
    /^(?!.*--)[a-zA-Z0-9-]{12}$/,
    'Expected a 12-character Swetrix project ID',
  )
  .describe('Swetrix project ID')
