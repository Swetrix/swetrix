import { Swetrix } from '@swetrix/node'

import { SWETRIX_PID } from '~/utils/analytics'
import { isSelfhosted, isDevelopment, API_URL } from '~/lib/constants'
import { getClientIP } from '~/api/api.server'

const swetrix = new Swetrix(SWETRIX_PID, {
  apiURL: isDevelopment ? `${API_URL}log` : undefined,
  disabled: isSelfhosted,
  devMode: isDevelopment,
})

const EXPERIMENT_FETCH_TIMEOUT_MS = 5_000

export async function getExperimentVariant(
  request: Request,
  experimentId: string,
  defaultVariant: string | null = null,
): Promise<string | null> {
  if (isSelfhosted) {
    return defaultVariant
  }

  try {
    const ip = getClientIP(request) || '127.0.0.1'
    const userAgent = request.headers.get('user-agent') || ''

    const variantPromise = swetrix.getExperiment(
      experimentId,
      ip,
      userAgent,
      undefined,
      defaultVariant,
    )
    let timeoutId: ReturnType<typeof setTimeout> | undefined
    const timeoutPromise = new Promise<string | null>((resolve) => {
      timeoutId = setTimeout(
        () => resolve(defaultVariant),
        EXPERIMENT_FETCH_TIMEOUT_MS,
      )
    })
    const variant = await Promise.race([variantPromise, timeoutPromise])

    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    return variant
  } catch (reason) {
    console.error(
      `[analytics.server] Failed to get experiment variant for ${experimentId}:`,
      reason,
    )
    return defaultVariant
  }
}
