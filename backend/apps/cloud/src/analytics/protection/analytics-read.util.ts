import _isString from 'lodash/isString'

import { getIPFromHeaders } from '../../common/utils'

export const getTrustworthyIp = (req: {
  headers: Record<string, unknown>
  ip?: string
}): string => {
  const realIp = req.headers['x-real-ip']
  if (_isString(realIp) && realIp) {
    return realIp.trim()
  }
  if (Array.isArray(realIp) && _isString(realIp[0]) && realIp[0]) {
    return realIp[0].trim()
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
