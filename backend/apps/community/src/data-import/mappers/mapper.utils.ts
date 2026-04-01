import * as crypto from 'crypto'

export const MOBILE_BROWSER_VARIANTS: Record<string, string> = {
  Chrome: 'Mobile Chrome',
  Firefox: 'Mobile Firefox',
  Safari: 'Mobile Safari',
}

export function normalizeNull(value: string | undefined): string | null {
  if (!value || value === '' || value === '\\N') return null
  return value
}

export function truncate(value: string | null, maxLen: number): string | null {
  if (!value) return null
  return value.length > maxLen ? value.slice(0, maxLen) : value
}

export function sessionIdToPsid(sessionId: string): string {
  return crypto
    .createHash('sha256')
    .update(sessionId)
    .digest()
    .readBigUInt64BE(0)
    .toString()
}
