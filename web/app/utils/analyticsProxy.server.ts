import { getClientIP } from '~/api/api.server'

const SWETRIX_API_BASE_URL = 'https://api.swetrix.com/log'
const PROXY_BASE_PATH = '/_internal_data_inngest_proxy'
const SWETRIX_LOG_PREFIX = '/log'
const SWETRIX_PID = 'STEzHcB1rALV'

const jsonError = (status: number, error: string) =>
  new Response(JSON.stringify({ error }), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  })

const stripSwetrixLogPrefix = (path: string) => {
  if (path === SWETRIX_LOG_PREFIX) {
    return ''
  }

  if (path.startsWith(`${SWETRIX_LOG_PREFIX}/`)) {
    return path.slice(SWETRIX_LOG_PREFIX.length)
  }

  return path
}

const buildTargetUrl = (requestUrl: string) => {
  const url = new URL(requestUrl)
  const pathWithoutBase = url.pathname.startsWith(PROXY_BASE_PATH)
    ? url.pathname.slice(PROXY_BASE_PATH.length)
    : url.pathname
  const normalizedPath = pathWithoutBase.startsWith('/')
    ? pathWithoutBase
    : `/${pathWithoutBase}`
  const targetPath = stripSwetrixLogPrefix(normalizedPath)

  return `${SWETRIX_API_BASE_URL}${targetPath}${url.search}`
}

export const proxySwetrixAnalyticsRequest = async (request: Request) => {
  if (request.method !== 'POST') {
    return jsonError(405, 'Method Not Allowed')
  }

  const targetUrl = buildTargetUrl(request.url)
  const headers = new Headers(request.headers)
  const bodyText = await request.text()

  headers.delete('host')
  headers.delete('content-length')

  // Forward the real visitor IP, same as serverFetch does for dashboard loaders.
  // Without this the API sees every first-party beacon as the web app's egress
  // IP and lumps them into one rate-limit bucket. getClientIP reads the
  // front-end nginx's X-Real-IP, so a browser can't spoof it; set() overwrites
  // any client-supplied X-Client-IP-Address.
  const clientIP = getClientIP(request)
  if (clientIP) {
    headers.set('X-Client-IP-Address', clientIP)
  }

  if (!bodyText) {
    return jsonError(400, 'Missing request body')
  }

  let payload: unknown
  try {
    payload = JSON.parse(bodyText)
  } catch {
    return jsonError(400, 'Invalid JSON payload')
  }

  const pid =
    typeof payload === 'object' && payload !== null && 'pid' in payload
      ? (payload as { pid?: unknown }).pid
      : undefined

  if (typeof pid !== 'string') {
    return jsonError(400, 'Missing pid in payload')
  }

  if (pid !== SWETRIX_PID) {
    return jsonError(403, 'Invalid pid')
  }

  return fetch(targetUrl, {
    method: request.method,
    headers,
    body: bodyText,
  })
}
