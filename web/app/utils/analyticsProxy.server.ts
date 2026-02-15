const SWETRIX_API_BASE_URL = 'https://api.swetrix.com/log'
const PROXY_BASE_PATH = '/_internal_data_inngest_proxy'
const SWETRIX_PID = 'STEzHcB1rALV'

const jsonError = (status: number, error: string) =>
  new Response(JSON.stringify({ error }), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  })

const buildTargetUrl = (requestUrl: string) => {
  const url = new URL(requestUrl)
  const pathWithoutBase = url.pathname.startsWith(PROXY_BASE_PATH)
    ? url.pathname.slice(PROXY_BASE_PATH.length)
    : url.pathname
  const normalizedPath = pathWithoutBase.startsWith('/')
    ? pathWithoutBase
    : `/${pathWithoutBase}`

  return `${SWETRIX_API_BASE_URL}${normalizedPath}${url.search}`
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
