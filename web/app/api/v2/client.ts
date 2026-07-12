import { V2Envelope } from './types'

class V2ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'V2ApiError'
    this.status = status
  }
}

export type V2QueryParams = Record<
  string,
  string | number | boolean | string[] | object | null | undefined
>

const serializeParams = (params: V2QueryParams): string => {
  const searchParams = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) {
      continue
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        continue
      }

      // filters (objects) -> JSON; plain values (metrics, events) -> CSV
      if (typeof value[0] === 'object') {
        searchParams.set(key, JSON.stringify(value))
      } else {
        searchParams.set(key, value.join(','))
      }
      continue
    }

    if (typeof value === 'object') {
      searchParams.set(key, JSON.stringify(value))
      continue
    }

    searchParams.set(key, String(value))
  }

  const qs = searchParams.toString()
  return qs ? `?${qs}` : ''
}

/**
 * Fetches a v2 analytics API endpoint through the /api/v2 proxy route
 * (which attaches auth and project-password headers server-side).
 *
 * `path` is relative to /v2/, e.g. `projects/<pid>/traffic/breakdown`.
 */
export async function fetchV2<T>(
  path: string,
  params: V2QueryParams = {},
  signal?: AbortSignal,
): Promise<V2Envelope<T>> {
  const response = await fetch(`/api/v2/${path}${serializeParams(params)}`, {
    signal,
  })

  let body: any = null
  try {
    body = await response.json()
  } catch {
    // non-JSON error response
  }

  if (!response.ok) {
    const message =
      (Array.isArray(body?.message)
        ? body.message.join('; ')
        : body?.message) ||
      body?.error ||
      `Request failed with status ${response.status}`
    throw new V2ApiError(response.status, message)
  }

  return body as V2Envelope<T>
}
