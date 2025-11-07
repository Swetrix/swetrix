/*
  Canonical referrer name mapping and helpers.

  Group referrers by a friendly name when possible (e.g., *.wikipedia.org -> "Wikipedia").
  Otherwise, group by hostname (strips leading www.).
*/

import MAP from '../referrers.map.json'

type ReferrerMapping = {
  name: string
  patterns: string[]
}

// Minimal curated map; extend as needed via JSON
export const REFERRER_MAP: ReferrerMapping[] = MAP as ReferrerMapping[]

export const extractHostname = (value: string | null | undefined): string | null => {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.hostname.toLowerCase()
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
      // Exact or subdomain match only
      if (host === p || host.endsWith(`.${p}`)) {
        return name
      }
    }
  }
  return null
}

const getCanonicalRefGroup = (refValue: string | null | undefined): { key: string; name: string } | null => {
  const value = (refValue || '').trim()
  // If a non-http(s) scheme is present, keep as-is (do not group)
  const scheme = value.match(/^([a-z][a-z0-9+.-]*):/i)?.[1]
  if (scheme && !/^https?$/i.test(scheme)) {
    return null
  }

  const host = extractHostname(value)
  if (!host) return null
  const plainHost = normaliseHost(host)
  const mapped = matchByMap(plainHost)
  if (mapped) return { key: mapped, name: mapped }
  return { key: plainHost, name: plainHost }
}

type Entry = { name: string | null; count: number; [k: string]: any }

// Group a list of ref entries by canonical name or hostname.
export const groupRefEntries = (entries: Entry[]): Entry[] => {
  const acc = new Map<string, number>()
  for (const e of entries) {
    if (e.name === null) {
      acc.set('null', (acc.get('null') || 0) + e.count)
      continue
    }
    const group = getCanonicalRefGroup(e.name)
    const key = group?.key || e.name
    acc.set(key, (acc.get(key) || 0) + e.count)
  }
  // Convert map to Entry[]
  const list: Entry[] = []
  for (const [key, count] of acc.entries()) {
    if (key === 'null') {
      list.push({ name: null, count })
    } else {
      list.push({ name: key, count })
    }
  }
  // Sort desc by count
  return list.sort((a, b) => b.count - a.count)
}
