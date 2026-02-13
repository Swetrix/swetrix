import { Swetrix, type TrackPageViewOptions } from '@swetrix/node'

import { SWETRIX_PID, PATHS_REPLACEMENT_MAP } from '~/utils/analytics'
import { isSelfhosted, isDevelopment, API_URL } from '~/lib/constants'
import { getClientIP } from '~/api/api.server'

const swetrix = new Swetrix(SWETRIX_PID, {
  apiURL: isDevelopment ? `${API_URL}log` : undefined,
  disabled: isSelfhosted,
  devMode: isDevelopment,
})

const REFS_TO_IGNORE = [
  /https:\/\/swetrix.com\/projects\/(?!new$)[^/]+$/i,
  /https:\/\/swetrix.com\/projects\/settings/i,
  /https:\/\/swetrix.com\/verify/i,
  /https:\/\/swetrix.com\/password-reset/i,
  /https:\/\/swetrix.com\/change-email/i,
  /https:\/\/swetrix.com\/share/i,
  /https:\/\/swetrix.com\/captchas\/(?!new$)[^/]+$/i,
  /https:\/\/swetrix.com\/captchas\/settings/i,
  /https:\/\/swetrix.com\/organisations\/[^/]+/i,
]

const BLOG_PAGE_REGEX = /^\/blog\/.+$/

const EXPERIMENT_FETCH_TIMEOUT_MS = 5_000

const checkIgnore = (path: string | undefined, ignore: RegExp[]) => {
  if (!path) {
    return false
  }

  for (let i = 0; i < ignore.length; ++i) {
    if (ignore[i].test(path)) {
      return true
    }
  }

  return false
}

const getNewPath = (path: string | undefined) => {
  if (!path) {
    return path
  }

  for (let i = 0; i < PATHS_REPLACEMENT_MAP.length; ++i) {
    const map = PATHS_REPLACEMENT_MAP[i]

    if (map.regex.test(path)) {
      return map.replacement
    }
  }

  return path
}

export const isBlogPostPath = (path: string) => BLOG_PAGE_REGEX.test(path)

export const trackPageview = async (
  request: Request,
  options: TrackPageViewOptions = {},
) => {
  if (isSelfhosted || isDevelopment) {
    return
  }

  try {
    const ip = getClientIP(request) || '127.0.0.1'
    const userAgent = request.headers.get('user-agent') || ''
    const url = new URL(request.url)
    const pg = getNewPath(options.pg || url.pathname)
    const ref = options.ref || request.headers.get('referer') || undefined

    await swetrix.trackPageView(ip, userAgent, {
      ...options,
      pg,
      ref: checkIgnore(ref, REFS_TO_IGNORE) ? undefined : ref,
    })
  } catch (reason) {
    console.error('[analytics.server] Failed to track pageview:', reason)
  }
}

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
