const MAX_RESPONSE_BYTES = 1024 * 1024

export function apiBaseUrl(value = 'https://api.swetrix.com') {
  let url
  try {
    url = new URL(value)
  } catch {
    throw new Error('SWETRIX_API_URL must be an absolute HTTP or HTTPS URL.')
  }
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    /\/v[12]\/?$/.test(url.pathname)
  ) {
    throw new Error(
      'Set SWETRIX_API_URL to the API base, without credentials, query string, fragment or API version.',
    )
  }
  return url.href.replace(/\/$/, '')
}

async function readBody(response) {
  if (!response.body) return ''
  const chunks = []
  let size = 0
  for await (const chunk of response.body) {
    size += chunk.byteLength
    if (size > MAX_RESPONSE_BYTES) {
      throw new Error(
        'Swetrix returned too much data. Request a smaller page, fewer metrics or a shorter date range.',
      )
    }
    chunks.push(chunk)
  }
  return Buffer.concat(chunks).toString('utf8')
}

function apiError(response, payload, apiKey) {
  const status = response.status
  let reason
  if (status === 401)
    reason = 'Check the API key. It may have been rotated or revoked.'
  else if (status === 429) {
    const seconds = response.headers.get('retry-after')
    reason = /^\d+$/.test(seconds)
      ? `Retry in ${seconds} seconds.`
      : 'The API rate limit was reached. Try again later.'
  } else if (status >= 400 && status < 500) {
    const message = Array.isArray(payload?.message)
      ? payload.message.join(', ')
      : payload?.message
    if (typeof message === 'string')
      reason = message.replaceAll(apiKey, '[redacted]').slice(0, 500)
  }
  const fallback =
    status >= 500
      ? 'The Swetrix API encountered a server error.'
      : 'Check the project, permissions and request parameters.'
  return new Error(`Swetrix API returned HTTP ${status}. ${reason || fallback}`)
}

export function createApi(baseUrl, apiKey, fetchImpl = fetch) {
  if (!apiKey || !/^[\x21-\x7e]{1,100}$/.test(apiKey)) {
    throw new Error('Provide a valid Swetrix API key.')
  }
  return {
    async request(
      path,
      { method = 'GET', query = {}, body, signal, idempotencyKey } = {},
    ) {
      if (!/^\/v[12]\//.test(path)) throw new Error('Invalid Swetrix API path.')
      const url = new URL(baseUrl + path)
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) url.searchParams.set(key, String(value))
      }
      const timeout = AbortSignal.timeout(30_000)
      const requestSignal = signal
        ? AbortSignal.any([signal, timeout])
        : timeout
      let response
      let raw
      try {
        response = await fetchImpl(url, {
          method,
          headers: {
            accept: 'application/json',
            'x-api-key': apiKey,
            ...(idempotencyKey === undefined
              ? {}
              : { 'Idempotency-Key': idempotencyKey }),
            ...(body === undefined
              ? {}
              : { 'content-type': 'application/json' }),
          },
          body: body === undefined ? undefined : JSON.stringify(body),
          redirect: 'error',
          signal: requestSignal,
        })
        raw = await readBody(response)
      } catch (error) {
        if (signal?.aborted) throw new Error('The request was cancelled.')
        if (timeout.aborted)
          throw new Error('Swetrix did not respond within 30 seconds.')
        if (error instanceof TypeError)
          throw new Error('Could not reach the configured Swetrix API.')
        throw error
      }
      let payload = null
      if (raw) {
        try {
          payload = JSON.parse(raw)
        } catch {
          if (response.ok)
            throw new Error(
              'Swetrix returned an unexpected response. Check the API base URL.',
            )
        }
      }
      if (!response.ok) throw apiError(response, payload, apiKey)
      return payload
    },
  }
}
