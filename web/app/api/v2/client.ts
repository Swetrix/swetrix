import { getProjectPassword } from '~/pages/Project/View/utils/cache'

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

const V2_PID_REGEX = /^projects\/([^/]+)/

export async function fetchV2<T>(
  path: string,
  params: V2QueryParams = {},
  signal?: AbortSignal,
): Promise<V2Envelope<T>> {
  // Pass the project password as a header: the swx_pp_* cookie is not sent by
  // browsers when the dashboard is embedded in a cross-site iframe.
  const headers: Record<string, string> = {}
  const pid = path.match(V2_PID_REGEX)?.[1]
  if (pid) {
    const password = getProjectPassword(pid)
    if (password) {
      headers['x-password'] = password
    }
  }

  const response = await fetch(`/api/v2/${path}${serializeParams(params)}`, {
    signal,
    headers,
  })

  let body: any = null
  try {
    body = await response.json()
  } catch {
    // ignore
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
