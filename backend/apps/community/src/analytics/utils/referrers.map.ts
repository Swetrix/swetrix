import MAP from './referrers.map.json'

type ReferrerJson = { name: string; patterns: string[] }

const REFERRER_MAP = MAP as ReferrerJson[]

export const getDomainsForRefName = (name: string): string[] | null => {
  const found = REFERRER_MAP.find(
    (g) => g.name.toLowerCase() === name.toLowerCase(),
  )
  if (!found) return null
  return found.patterns
}
