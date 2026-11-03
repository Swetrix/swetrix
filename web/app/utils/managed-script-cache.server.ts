import { createHash } from 'node:crypto'

interface CacheEntry {
  result: Promise<{ body: string | null; etag: string | undefined }>
  expiresAt: number
  invalidated: boolean
}

const cache = new Map<string, CacheEntry>()
const maxEntries = 512

export function invalidateManagedScript(pid: string) {
  const entry = cache.get(pid)
  if (entry) {
    entry.invalidated = true
    cache.delete(pid)
  }
}

function loadEntry(
  pid: string,
  load: () => Promise<string | null>,
): CacheEntry {
  if (cache.size >= maxEntries) {
    for (const [key, entry] of cache) {
      if (entry.expiresAt !== Infinity) {
        cache.delete(key)
        break
      }
    }
    if (cache.size >= maxEntries) throw new Error('Tracker cache is busy')
  }

  const started = Date.now()
  const entry: CacheEntry = {
    expiresAt: Infinity,
    invalidated: false,
    result: Promise.resolve()
      .then(load)
      .then((body) => {
        entry.expiresAt = started + (body === null ? 15_000 : 300_000)
        const etag =
          body === null
            ? undefined
            : `W/"${createHash('sha256').update(body).digest('base64url')}"`
        return { body, etag }
      }),
  }
  cache.set(pid, entry)
  return entry
}

export async function getCachedManagedScript(
  pid: string,
  load: () => Promise<string | null>,
): Promise<{ body: string | null; etag: string | undefined; maxAge: number }> {
  let entry = cache.get(pid)
  if (entry) cache.delete(pid)
  if (entry && Date.now() < entry.expiresAt) {
    cache.set(pid, entry)
  } else {
    entry = loadEntry(pid, load)
  }

  try {
    const script = await entry.result
    if (entry.invalidated) return getCachedManagedScript(pid, load)
    const maxAge = Math.max(
      0,
      Math.floor((entry.expiresAt - Date.now()) / 1000),
    )
    return { ...script, maxAge }
  } catch (error) {
    if (cache.get(pid) === entry) cache.delete(pid)
    throw error
  }
}
