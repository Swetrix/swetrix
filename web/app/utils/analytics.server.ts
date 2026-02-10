import { Swetrix } from '@swetrix/node'

import { SWETRIX_PID } from '~/utils/analytics'
import { isSelfhosted, isDevelopment, API_URL } from '~/lib/constants'
import { getClientIP } from '~/api/api.server'

const swetrix = new Swetrix(SWETRIX_PID, {
  apiURL: isDevelopment ? `${API_URL}log` : undefined,
  disabled: isSelfhosted,
  devMode: isDevelopment,
})

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

    const variant = await swetrix.getExperiment(
      experimentId,
      ip,
      userAgent,
      undefined,
      defaultVariant,
    )

    return variant
  } catch (reason) {
    console.error(
      `[analytics.server] Failed to get experiment variant for ${experimentId}:`,
      reason,
    )
    return defaultVariant
  }
}
