import _isString from 'lodash/isString'

import { getIPFromHeaders } from '../../common/utils'

// IPs of our OWN reverse proxies / SSR front-end (e.g. the web app egress IP).
// Comma-separated, e.g. TRUSTED_PROXY_IPS=167.235.69.100,167.235.69.101.
//
// Why this matters: the web app's SSR loaders call this API on behalf of end
// users, so without this every proxied request looks like it comes from the
// single web-app IP — and a per-IP limit then lumps the whole dashboard (plus
// any attack proxied through it) into ONE bucket and 429s everyone. When a
// request arrives FROM a trusted proxy, the real visitor IP is in
// X-Client-IP-Address (set by web/app/api/api.server.ts), so we key on that.
//
// Trusting the header ONLY from these IPs is what makes it safe: a direct
// attacker hitting the API cannot spoof X-Client-IP-Address to dodge limits,
// because their connection IP isn't in this set.
const TRUSTED_PROXY_IPS = new Set(
  (process.env.TRUSTED_PROXY_IPS || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean),
)

const firstHeaderValue = (value: unknown): string => {
  if (_isString(value) && value) {
    return value.trim()
  }
  if (Array.isArray(value) && _isString(value[0]) && value[0]) {
    return value[0].trim()
  }
  return ''
}

export const getTrustworthyIp = (req: {
  headers: Record<string, unknown>
  ip?: string
}): string => {
  // The real TCP peer as nginx sees it (proxy.conf sets X-Real-IP = $remote_addr).
  // If nginx realip is configured this is already the real visitor; if not, it's
  // the proxy hop for proxied traffic.
  const connectionIp = firstHeaderValue(req.headers['x-real-ip'])

  // Behind a trusted proxy: prefer the forwarded real visitor IP. This is the
  // app-level equivalent of nginx realip and works even when realip isn't set up.
  if (connectionIp && TRUSTED_PROXY_IPS.has(connectionIp)) {
    const forwarded = firstHeaderValue(req.headers['x-client-ip-address'])
    if (forwarded) {
      return forwarded
    }
  }

  if (connectionIp) {
    return connectionIp
  }

  return getIPFromHeaders(req.headers) || req.ip || ''
}

export const getSinglePid = (query: Record<string, unknown>): string | null => {
  const { pid, pids } = query

  if (_isString(pid) && pid) {
    return pid
  }

  if (_isString(pids) && pids) {
    try {
      const parsed = JSON.parse(pids)
      if (
        Array.isArray(parsed) &&
        parsed.length === 1 &&
        _isString(parsed[0])
      ) {
        return parsed[0]
      }
    } catch {
      return null
    }
  }

  return null
}

export const getAnalyticsRoute = (path: string): string =>
  path.replace(/^\/(v1\/)?log\/?/, '').replace(/\/$/, '')
