import type { Entry } from '~/lib/models/Entry'

import MAP from '../referrers.map.json'

type ReferrerMapping = {
  name: string
  patterns: string[]
}

const REFERRER_MAP: ReferrerMapping[] = MAP as ReferrerMapping[]

const extractHostname = (value: string | null | undefined): string | null => {
  if (!value) return null
  try {
    const url = new URL(value)
    const host = url.hostname.toLowerCase()
    // Accept only real domains (has a dot) or IPv4; reject ids like "abc123"
    if (host.includes('.') || /^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
      return host
    }
    return null
  } catch {
    const trimmed = value.trim().toLowerCase()
    if (trimmed.includes(' ')) return null
    // Try to parse assuming http scheme to reliably extract host from strings like "example.com/path"
    try {
      const url = new URL(`http://${trimmed}`)
      const host = url.hostname.toLowerCase()
      // Accept only real domains (has a dot) or IPv4; reject bare words like "reddit"
      if (host.includes('.') || /^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
        return host
      }
    } catch {
      // Fallback: accept bare hostnames only
      const bare = trimmed.split('/')[0].split('?')[0].split('#')[0]
      if (/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(bare)) return bare
    }
    return null
  }
}

const normaliseHost = (host: string): string => host.replace(/^www\./, '')

const matchByMap = (host: string): string | null => {
  for (const { name, patterns } of REFERRER_MAP) {
    for (const p of patterns) {
      // Support patterns that may include a scheme (e.g. android-app://...)
      // Extract hostname from the pattern and compare on host level.
      let patternHost = p.toLowerCase()
      if (p.includes('://')) {
        try {
          patternHost = new URL(p).hostname.toLowerCase()
        } catch {
          // Ignore malformed pattern entries
          continue
        }
      }
      patternHost = normaliseHost(patternHost)

      // Exact or subdomain match only
      if (host === patternHost || host.endsWith(`.${patternHost}`)) {
        return name
      }
    }
  }
  return null
}

const getCanonicalRefGroup = (refValue: string | null): { key: string; name: string } | null => {
  const value = (refValue || '').trim()

  const host = extractHostname(value)
  if (!host) return null
  const plainHost = normaliseHost(host)
  const mapped = matchByMap(plainHost)
  if (mapped) return { key: mapped, name: mapped }
  return { key: plainHost, name: plainHost }
}

export const groupRefEntries = (entries: Entry[]): Entry[] => {
  const acc = new Map<string | null, number>()

  for (const e of entries) {
    const group = getCanonicalRefGroup(e.name)
    const key = group?.key || e.name
    acc.set(key, (acc.get(key) || 0) + e.count)
  }

  const list: Entry[] = []

  for (const [key, count] of acc.entries()) {
    list.push({ name: key, count })
  }

  return list.sort((a, b) => b.count - a.count)
}

export const getFaviconHost = (value: string | null): string | null => {
  if (!value) return null

  // 1) Direct URL -> hostname
  try {
    const urlObj = new URL(value)
    return urlObj.hostname
  } catch {
    // not a URL
  }

  // 2) Try to extract hostname from non-URL strings
  const hostFromValue = extractHostname(value)
  if (hostFromValue) return hostFromValue

  // 3) If value is a mapped referrer group name, use the first domain-like pattern
  const mapping = REFERRER_MAP.find((m) => value.toLowerCase() === m.name.toLowerCase())
  if (!mapping) return null
  const domainLike = mapping.patterns.find((p) => !p.includes('://') && p.includes('.'))
  return domainLike || null
}
