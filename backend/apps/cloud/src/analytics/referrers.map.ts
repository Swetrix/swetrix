import fs from 'fs'
import path from 'path'

type ReferrerJson = { name: string; patterns: string[] }

let cachedMap: ReferrerJson[] | null = null

const loadMap = (): ReferrerJson[] => {
  if (cachedMap) return cachedMap
  const candidates = [
    // Repo root (when running from project root)
    path.resolve(process.cwd(), 'web/app/utils/referrers.map.json'),
    // Relative to compiled file location
    path.resolve(__dirname, '../../../../../web/app/utils/referrers.map.json'),
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
  cachedMap = []
  return cachedMap
}

export const getDomainsForRefName = (name: string): string[] | null => {
  const list = loadMap()
  const found = list.find(g => g.name.toLowerCase() === name.toLowerCase())
  if (!found) return null
  return found.patterns
}
