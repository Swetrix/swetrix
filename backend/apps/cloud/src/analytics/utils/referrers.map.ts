import fs from 'fs'
import path from 'path'

type ReferrerJson = { name: string; patterns: string[] }

let cachedMap: ReferrerJson[] | null = null

const loadMap = (): ReferrerJson[] => {
  if (cachedMap) return cachedMap
  const candidates = [
    // Dev mode
    path.resolve(__dirname, '../../../../../web/app/referrers.map.json'),
    // Compiled mode
    path.resolve(__dirname, '../../../../web/app/referrers.map.json'),
  ]
  for (const p of candidates) {
    try {
      const raw = fs.readFileSync(p, 'utf8')
      cachedMap = JSON.parse(raw) as ReferrerJson[]
      return cachedMap
    } catch {
      // try next location
    }
  }
  console.warn(
    '[WARN] Failed to load referrers map from all candidate paths, using empty map',
  )
  cachedMap = []
  return cachedMap
}

export const getDomainsForRefName = (name: string): string[] | null => {
  const list = loadMap()
  const found = list.find((g) => g.name.toLowerCase() === name.toLowerCase())
  if (!found) return null
  return found.patterns
}
