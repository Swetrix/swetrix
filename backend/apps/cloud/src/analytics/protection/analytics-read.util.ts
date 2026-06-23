import _isString from 'lodash/isString'

import { getIPFromHeaders } from '../../common/utils'

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
  const connectionIp = firstHeaderValue(req.headers['x-real-ip'])

  if (connectionIp && TRUSTED_PROXY_IPS.has(connectionIp)) {
    return firstHeaderValue(req.headers['x-client-ip-address'])
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
