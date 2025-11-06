/*
  Canonical referrer name mapping and helpers.

  Group referrers by a friendly name when possible (e.g., *.wikipedia.org -> "Wikipedia").
  Otherwise, group by hostname (strips leading www.).
*/

import MAP from './referrers.map.json'

export type ReferrerMapping = {
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
    // If it's already a hostname (no protocol), return as lowercased
    const trimmed = value.trim().toLowerCase()
    if (trimmed.includes(' ')) return null
    if (trimmed.includes('.') || /^[a-z0-9-]+\.[a-z]{2,}$/.test(trimmed)) return trimmed
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

export const getCanonicalRefGroup = (refValue: string | null | undefined): { key: string; name: string } | null => {
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

export type Entry = { name: string | null; count: number; [k: string]: any }

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
