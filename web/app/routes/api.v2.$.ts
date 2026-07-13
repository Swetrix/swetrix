import { type LoaderFunctionArgs, data } from 'react-router'

import { serverFetch } from '~/api/api.server'
import {
  createHeadersWithCookies,
  getProjectPasswordCookie,
} from '~/utils/session.server'

// Proxies GET /api/v2/projects/<pid>/... to the backend /v2/projects/<pid>/...
// analytics API. Keeps auth tokens (httpOnly cookies -> Bearer, with refresh)
// and the per-project password cookie (-> x-password) server-side.
const V2_PATH_REGEX = /^projects\/([a-zA-Z0-9-]{1,64})(\/|$)/

// A dot / dot-dot path segment, literal or percent-encoded (%2e). `fetch`'s URL
// parser normalises these, so `..` could escape the /v2/ prefix and reach other
// backend routes — reject them before building the upstream request.
const hasTraversalSegment = (path: string): boolean =>
  path.split('/').some((segment) => {
    const normalized = segment.replace(/%2e/gi, '.')
    return normalized === '.' || normalized === '..'
  })

export async function loader({ request, params }: LoaderFunctionArgs) {
  const path = params['*'] || ''

  const match = path.match(V2_PATH_REGEX)

  if (!match || hasTraversalSegment(path)) {
    return data({ error: 'Invalid v2 API path' }, { status: 400 })
  }

  const pid = match[1]
  const password = getProjectPasswordCookie(request, pid)
  const { search } = new URL(request.url)

  const result = await serverFetch(request, `v2/${path}${search}`, {
    headers: password ? { 'x-password': password } : undefined,
  })

  return data(result.data ?? { error: result.error }, {
    status: result.status,
    headers: createHeadersWithCookies(result.cookies),
  })
}
