import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import * as os from 'os'
import { Unzip, UnzipInflate } from 'fflate'
import { createInterface } from 'readline'
import { readCsvRows } from './csv.utils'

import {
  ImportMapper,
  ImportError,
  AnalyticsImportRow,
} from './mapper.interface'
import {
  normalizeNull,
  truncate,
  sessionIdToPsid,
  MOBILE_BROWSER_VARIANTS,
} from './mapper.utils'

const MAX_PLAUSIBLE_ZIP_BYTES = 100 * 1024 * 1024
const MAX_PLAUSIBLE_UNCOMPRESSED_BYTES = 2 * 1024 * 1024 * 1024
const MAX_DAILY_BYTES = 128 * 1024 * 1024
const MIN_PAGE_GAP_SEC = 5
const MAX_PAGE_GAP_SEC = 30 * 60
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

const MAX_SESSIONS_PER_DAY = 1_000_000
const MAX_PAGEVIEWS_PER_SESSION = 1_000
const MAX_EVENTS_PER_DAY = 1_000_000
const MAX_GENERATED_ROWS_PER_IMPORT = 100_000_000
const MAX_SAFE_COUNT = Number.MAX_SAFE_INTEGER

const FILE_PATTERNS: Record<string, RegExp> = {
  visitors: /(^|\/)imported_visitors[^/]*\.csv$/i,
  pages: /(^|\/)imported_pages[^/]*\.csv$/i,
  browsers: /(^|\/)imported_browsers[^/]*\.csv$/i,
  devices: /(^|\/)imported_devices[^/]*\.csv$/i,
  operatingSystems: /(^|\/)imported_operating_systems[^/]*\.csv$/i,
  locations: /(^|\/)imported_locations[^/]*\.csv$/i,
  sources: /(^|\/)imported_sources[^/]*\.csv$/i,
  entryPages: /(^|\/)imported_entry_pages[^/]*\.csv$/i,
  exitPages: /(^|\/)imported_exit_pages[^/]*\.csv$/i,
  customEvents: /(^|\/)imported_custom_events[^/]*\.csv$/i,
}

const OS_MAP: Record<string, string> = {
  Mac: 'macOS',
  GNU: 'Linux',
  Ubuntu: 'Linux',
  iOS: 'iOS',
  Android: 'Android',
  Windows: 'Windows',
  'Chrome OS': 'Chrome OS',
}

const DEVICE_MAP: Record<string, string> = {
  Desktop: 'desktop',
  Laptop: 'desktop',
  Mobile: 'mobile',
  Tablet: 'tablet',
}

interface VisitorRow {
  date: string
  visitors: number
  pageviews: number
  visits: number
  bounces: number
  visit_duration: number
}

interface BrowserRow {
  browser: string | null
  browser_version: string | null
  visits: number
}

interface DeviceRow {
  device: string | null
  visits: number
}

interface OsRow {
  operating_system: string | null
  operating_system_version: string | null
  visits: number
}

interface LocationRow {
  country: string | null
  region: string | null
  visits: number
}

interface SourceRow {
  source: string | null
  referrer: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_content: string | null
  utm_term: string | null
  visits: number
}

interface PageRow {
  hostname: string | null
  page: string | null
  pageviews: number
}

interface EntryPageRow {
  entry_page: string | null
  entrances: number
}

interface ExitPageRow {
  exit_page: string | null
  exits: number
}

interface CustomEventRow {
  name: string
  url: string | null
  events: number
}

interface DailyData {
  visitors: VisitorRow
  browsers: BrowserRow[]
  devices: DeviceRow[]
  os: OsRow[]
  locations: LocationRow[]
  sources: SourceRow[]
  pages: PageRow[]
  entryPages: EntryPageRow[]
  exitPages: ExitPageRow[]
  customEvents: CustomEventRow[]
}

function seededPrng(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function seedFromString(s: string): number {
  return crypto.createHash('sha256').update(s).digest().readUInt32BE(0)
}

function toInt(value: string | undefined, fieldName = 'value'): number {
  if (value === undefined || value === null || value === '') return 0
  const n = /^\d+$/.test(value) ? Number(value) : NaN
  if (!Number.isFinite(n) || Number.isNaN(n) || !Number.isSafeInteger(n)) {
    throw new ImportError(
      `Plausible export contains an invalid numeric ${fieldName}: ${value}`,
    )
  }
  if (n < 0) {
    throw new ImportError(
      `Plausible export contains a negative numeric ${fieldName}: ${value}`,
    )
  }
  return Math.min(n, MAX_SAFE_COUNT)
}

async function* readDailyRows(
  paths: string[],
): AsyncIterable<Record<string, string>> {
  for (const filePath of paths) {
    const input = fs.createReadStream(filePath)
    const lines = createInterface({ input, crlfDelay: Infinity })
    input.on('error', (error) => lines.emit('error', error))
    try {
      for await (const line of lines) {
        yield JSON.parse(line)
      }
    } finally {
      lines.close()
      input.destroy()
    }
  }
}

function mapBrowser(raw: string | null, device: string | null): string | null {
  if (!raw) return null
  const isMobile = device === 'mobile' || device === 'tablet'
  if (isMobile && MOBILE_BROWSER_VARIANTS[raw]) {
    return MOBILE_BROWSER_VARIANTS[raw]
  }
  return raw
}

function mapOS(raw: string | null): string | null {
  if (!raw) return null
  return OS_MAP[raw] ?? raw
}

function mapDevice(raw: string | null): string {
  if (!raw) return 'desktop'
  return DEVICE_MAP[raw] ?? raw.toLowerCase()
}

function parseRegion(raw: string | null): string | null {
  if (!raw) return null
  const dash = raw.indexOf('-')
  if (dash < 0) return raw.slice(0, 10)
  return raw.slice(dash + 1).slice(0, 10) || null
}

function buildReferrer(
  referrer: string | null,
  source: string | null,
  hostname: string | null,
): string | null {
  const candidate = referrer || source
  if (!candidate || candidate.toLowerCase() === 'direct') return null

  let url: string
  if (candidate.includes('://')) {
    url = candidate
  } else if (candidate.includes('.')) {
    url = `https://${candidate}`
  } else {
    return null
  }

  if (hostname) {
    try {
      const parsed = new URL(url)
      const cleanRef = parsed.hostname.replace(/^www\./, '')
      const cleanHost = hostname.replace(/^www\./, '')
      if (cleanRef === cleanHost) return null
    } catch {
      // ignore
    }
  }

  return url
}

function pickSiteHostname(pages: PageRow[]): string | null {
  if (pages.length === 0) return null
  const counts = new Map<string, number>()
  for (const p of pages) {
    if (!p.hostname) continue
    counts.set(p.hostname, (counts.get(p.hostname) ?? 0) + p.pageviews)
  }
  let best: string | null = null
  let bestCount = -1
  for (const [host, count] of counts) {
    if (count > bestCount) {
      best = host
      bestCount = count
    }
  }
  return best
}

const MAX_POOL_SIZE = 2_000_000

function buildShuffledPool<T>(
  items: T[],
  counts: number[],
  prng: () => number,
): T[] {
  if (items.length === 0) return []

  const safeCounts: number[] = new Array(items.length)
  let total = 0
  for (let i = 0; i < items.length; i++) {
    const c = counts[i]
    const safe = c > 0 ? c : 0
    safeCounts[i] = safe
    total += safe
  }
  if (total <= 0) return []

  // Allocate per-item slots, scaling proportionally if the total would
  // exceed MAX_POOL_SIZE. Largest-remainder method keeps the assigned
  // counts as close to the original ratios as possible while preserving
  // the exact target total.
  let allocations: number[]
  let poolSize: number
  if (total > MAX_POOL_SIZE) {
    allocations = new Array(items.length).fill(0)
    const fractions: { idx: number; rem: number }[] = []
    let assigned = 0
    for (let i = 0; i < items.length; i++) {
      if (safeCounts[i] === 0) continue
      const scaled = (safeCounts[i] * MAX_POOL_SIZE) / total
      const floor = Math.floor(scaled)
      allocations[i] = floor
      assigned += floor
      fractions.push({ idx: i, rem: scaled - floor })
    }
    fractions.sort((a, b) => b.rem - a.rem || a.idx - b.idx)
    let remaining = MAX_POOL_SIZE - assigned
    for (let i = 0; i < fractions.length && remaining > 0; i++) {
      allocations[fractions[i].idx] += 1
      remaining -= 1
    }
    poolSize = MAX_POOL_SIZE
  } else {
    allocations = safeCounts
    poolSize = total
  }

  const pool: T[] = new Array(poolSize)
  let p = 0
  for (let i = 0; i < items.length; i++) {
    const c = allocations[i]
    for (let j = 0; j < c; j++) {
      pool[p++] = items[i]
    }
  }

  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(prng() * (i + 1))
    const tmp = pool[i]
    pool[i] = pool[j]
    pool[j] = tmp
  }

  return pool
}

function pickFromPool<T>(pool: T[], idx: number): T | null {
  if (pool.length === 0) return null
  return pool[idx % pool.length]
}

interface PoolBundle {
  browsers: BrowserRow[]
  devices: DeviceRow[]
  os: OsRow[]
  locations: LocationRow[]
  sources: SourceRow[]
  pages: PageRow[]
  entryPages: EntryPageRow[]
  exitPages: ExitPageRow[]
}

function buildPools(
  daily: DailyData,
  importID: number,
  date: string,
): PoolBundle {
  const seedFor = (label: string) =>
    seededPrng(seedFromString(`${importID}|${date}|pool|${label}`))

  return {
    browsers: buildShuffledPool(
      daily.browsers,
      daily.browsers.map((r) => r.visits),
      seedFor('browsers'),
    ),
    devices: buildShuffledPool(
      daily.devices,
      daily.devices.map((r) => r.visits),
      seedFor('devices'),
    ),
    os: buildShuffledPool(
      daily.os,
      daily.os.map((r) => r.visits),
      seedFor('os'),
    ),
    locations: buildShuffledPool(
      daily.locations,
      daily.locations.map((r) => r.visits),
      seedFor('locations'),
    ),
    sources: buildShuffledPool(
      daily.sources,
      daily.sources.map((r) => r.visits),
      seedFor('sources'),
    ),
    pages: buildShuffledPool(
      daily.pages,
      daily.pages.map((r) => r.pageviews),
      seedFor('pages'),
    ),
    entryPages: buildShuffledPool(
      daily.entryPages,
      daily.entryPages.map((r) => r.entrances),
      seedFor('entryPages'),
    ),
    exitPages: buildShuffledPool(
      daily.exitPages,
      daily.exitPages.map((r) => r.exits),
      seedFor('exitPages'),
    ),
  }
}

function formatDateTime(epochSec: number): string {
  const d = new Date(epochSec * 1000)
  const yyyy = d.getUTCFullYear()
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const mi = String(d.getUTCMinutes()).padStart(2, '0')
  const ss = String(d.getUTCSeconds()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`
}

function dateToEpochSec(date: string): number {
  return Math.floor(new Date(`${date}T00:00:00Z`).getTime() / 1000)
}

export class PlausibleMapper implements ImportMapper {
  readonly provider = 'plausible'
  readonly expectedFileExtension = '.zip'

  private async extractCsvs(
    zipPath: string,
    tempDir: string,
  ): Promise<Map<string, string[]>> {
    const stat = await fs.promises.stat(zipPath)
    if (stat.size > MAX_PLAUSIBLE_ZIP_BYTES) {
      throw new ImportError('Plausible ZIP exceeds the 100 MB upload limit.')
    }

    const found = new Map<string, string[]>()
    const openFiles = new Set<number>()
    let totalUncompressed = 0
    let entryCount = 0
    let pendingEntries = 0
    const unzipper = new Unzip((file) => {
      if (++entryCount > 1000) {
        throw new ImportError('Plausible ZIP contains too many files.')
      }
      const key = Object.keys(FILE_PATTERNS).find((key) =>
        FILE_PATTERNS[key].test(file.name),
      )
      if (file.originalSize > MAX_PLAUSIBLE_UNCOMPRESSED_BYTES) {
        throw new ImportError(
          'Plausible ZIP exceeds the 2 GiB uncompressed limit. Please export a shorter date range.',
        )
      }
      let fd: number | undefined
      if (key) {
        const csvPath = path.join(tempDir, `${entryCount}.csv`)
        fd = fs.openSync(csvPath, 'wx')
        openFiles.add(fd)
        found.set(key, [...(found.get(key) ?? []), csvPath])
      }
      pendingEntries++
      file.ondata = (error, chunk, final) => {
        if (error) throw error
        totalUncompressed += chunk.length
        if (totalUncompressed > MAX_PLAUSIBLE_UNCOMPRESSED_BYTES) {
          throw new ImportError(
            'Plausible ZIP exceeds the 2 GiB uncompressed limit. Please export a shorter date range.',
          )
        }
        if (fd !== undefined) {
          let offset = 0
          while (offset < chunk.length) {
            offset += fs.writeSync(fd, chunk, offset, chunk.length - offset)
          }
          if (final) {
            fs.closeSync(fd)
            openFiles.delete(fd)
            fd = undefined
          }
        }
        if (final) pendingEntries--
      }
      file.start()
    })
    unzipper.register(UnzipInflate)

    try {
      for await (const chunk of fs.createReadStream(zipPath, {
        highWaterMark: 16 * 1024,
      })) {
        unzipper.push(chunk as Buffer)
      }
      unzipper.push(new Uint8Array(0), true)
      if (pendingEntries > 0) throw new Error('Incomplete ZIP entry')
    } catch (error) {
      if (error instanceof ImportError) throw error
      throw new ImportError(
        'Could not read the uploaded ZIP archive. Please upload the full export ZIP from Plausible again.',
      )
    } finally {
      for (const fd of openFiles) fs.closeSync(fd)
    }
    if (!found.has('visitors')) {
      throw new ImportError(
        'ZIP does not contain imported_visitors_*.csv. Please upload the full export ZIP from Plausible.',
      )
    }
    return found
  }

  private async partitionCsvs(csvs: Map<string, string[]>, tempDir: string) {
    const days = new Map<string, Map<string, string[]>>()
    const daySizes = new Map<string, number>()
    const buffers = new Map<string, string[]>()
    let bufferedBytes = 0
    const flush = async () => {
      for (const [filePath, rows] of buffers) {
        await fs.promises.appendFile(filePath, rows.join(''))
      }
      buffers.clear()
      bufferedBytes = 0
    }
    const required: Record<string, string[]> = {
      visitors: ['date', 'visits', 'pageviews'],
      pages: ['date', 'page', 'pageviews'],
      browsers: ['date', 'browser', 'visits'],
      devices: ['date', 'device', 'visits'],
      operatingSystems: ['date', 'operating_system', 'visits'],
      locations: ['date', 'country', 'visits'],
      sources: ['date', 'source', 'visits'],
      entryPages: ['date', 'entry_page', 'entrances'],
      exitPages: ['date', 'exit_page', 'exits'],
      customEvents: ['date', 'name', 'events'],
    }
    for (const [key, paths] of csvs) {
      for (const csvPath of paths) {
        for await (const row of readCsvRows(csvPath, {
          columns: (headers: string[]) => {
            const missing = required[key].filter(
              (column) => !headers.includes(column),
            )
            if (missing.length)
              throw new ImportError(
                `Plausible ${key} CSV is missing columns: ${missing.join(', ')}.`,
              )
            return headers
          },
        })) {
          const date = normalizeNull(row.date)
          if (!date || !DATE_REGEX.test(date)) continue
          const parsedDate = new Date(`${date}T00:00:00Z`)
          if (
            !Number.isFinite(parsedDate.getTime()) ||
            parsedDate.toISOString().slice(0, 10) !== date
          )
            continue
          const line = `${JSON.stringify(row)}\n`
          const bytes = Buffer.byteLength(line)
          const daySize = (daySizes.get(date) ?? 0) + bytes
          if (daySize > MAX_DAILY_BYTES)
            throw new ImportError(
              `Plausible data for ${date} exceeds the 128 MiB daily processing limit. Please contact support.`,
            )
          daySizes.set(date, daySize)
          const dayFiles = days.get(date) ?? new Map<string, string[]>()
          const filePath = path.join(tempDir, `${date}-${key}.jsonl`)
          dayFiles.set(key, [filePath])
          days.set(date, dayFiles)
          const rows = buffers.get(filePath) ?? []
          rows.push(line)
          buffers.set(filePath, rows)
          bufferedBytes += bytes
          if (bufferedBytes >= 1024 * 1024) await flush()
        }
        await fs.promises.unlink(csvPath)
      }
    }
    await flush()
    return days
  }

  private async buildDailyData(
    csvs: Map<string, string[]>,
  ): Promise<Map<string, DailyData>> {
    const visitorsFiles = csvs.get('visitors')
    if (!visitorsFiles) {
      throw new ImportError(
        'ZIP does not contain imported_visitors_*.csv. Please upload the full export ZIP from Plausible.',
      )
    }

    const days = new Map<string, DailyData>()

    const ensureDay = (date: string): DailyData => {
      let d = days.get(date)
      if (!d) {
        d = {
          visitors: {
            date,
            visitors: 0,
            pageviews: 0,
            visits: 0,
            bounces: 0,
            visit_duration: 0,
          },
          browsers: [],
          devices: [],
          os: [],
          locations: [],
          sources: [],
          pages: [],
          entryPages: [],
          exitPages: [],
          customEvents: [],
        }
        days.set(date, d)
      }
      return d
    }

    for await (const row of readDailyRows(visitorsFiles)) {
      const date = normalizeNull(row.date)
      if (!date || !DATE_REGEX.test(date)) continue
      const visits = toInt(row.visits, 'visits')
      const pageviews = toInt(row.pageviews, 'pageviews')
      const day = ensureDay(date)
      day.visitors = {
        date,
        visitors: day.visitors.visitors + toInt(row.visitors, 'visitors'),
        pageviews: day.visitors.pageviews + pageviews,
        visits: day.visitors.visits + visits,
        bounces: day.visitors.bounces + toInt(row.bounces, 'bounces'),
        visit_duration:
          day.visitors.visit_duration +
          toInt(row.visit_duration, 'visit_duration'),
      }
    }

    if (days.size === 0) {
      throw new ImportError(
        'imported_visitors_*.csv contains no valid daily rows.',
      )
    }

    const pagesFiles = csvs.get('pages')
    if (pagesFiles) {
      for await (const row of readDailyRows(pagesFiles)) {
        const date = normalizeNull(row.date)
        if (!date || !days.has(date)) continue
        const pageviews = toInt(row.pageviews)
        if (pageviews <= 0) continue
        days.get(date)!.pages.push({
          hostname: normalizeNull(row.hostname),
          page: normalizeNull(row.page),
          pageviews,
        })
      }
    }

    const browsersFiles = csvs.get('browsers')
    if (browsersFiles) {
      for await (const row of readDailyRows(browsersFiles)) {
        const date = normalizeNull(row.date)
        if (!date || !days.has(date)) continue
        const visits = toInt(row.visits)
        if (visits <= 0) continue
        days.get(date)!.browsers.push({
          browser: normalizeNull(row.browser),
          browser_version: normalizeNull(row.browser_version),
          visits,
        })
      }
    }

    const devicesFiles = csvs.get('devices')
    if (devicesFiles) {
      for await (const row of readDailyRows(devicesFiles)) {
        const date = normalizeNull(row.date)
        if (!date || !days.has(date)) continue
        const visits = toInt(row.visits)
        if (visits <= 0) continue
        days.get(date)!.devices.push({
          device: normalizeNull(row.device),
          visits,
        })
      }
    }

    const osFiles = csvs.get('operatingSystems')
    if (osFiles) {
      for await (const row of readDailyRows(osFiles)) {
        const date = normalizeNull(row.date)
        if (!date || !days.has(date)) continue
        const visits = toInt(row.visits)
        if (visits <= 0) continue
        days.get(date)!.os.push({
          operating_system: normalizeNull(row.operating_system),
          operating_system_version: normalizeNull(row.operating_system_version),
          visits,
        })
      }
    }

    const locationsFiles = csvs.get('locations')
    if (locationsFiles) {
      for await (const row of readDailyRows(locationsFiles)) {
        const date = normalizeNull(row.date)
        if (!date || !days.has(date)) continue
        const visits = toInt(row.visits)
        if (visits <= 0) continue
        days.get(date)!.locations.push({
          country: normalizeNull(row.country),
          region: normalizeNull(row.region),
          visits,
        })
      }
    }

    const sourcesFiles = csvs.get('sources')
    if (sourcesFiles) {
      for await (const row of readDailyRows(sourcesFiles)) {
        const date = normalizeNull(row.date)
        if (!date || !days.has(date)) continue
        const visits = toInt(row.visits)
        if (visits <= 0) continue
        days.get(date)!.sources.push({
          source: normalizeNull(row.source),
          referrer: normalizeNull(row.referrer),
          utm_source: normalizeNull(row.utm_source),
          utm_medium: normalizeNull(row.utm_medium),
          utm_campaign: normalizeNull(row.utm_campaign),
          utm_content: normalizeNull(row.utm_content),
          utm_term: normalizeNull(row.utm_term),
          visits,
        })
      }
    }

    const entryPagesFiles = csvs.get('entryPages')
    if (entryPagesFiles) {
      for await (const row of readDailyRows(entryPagesFiles)) {
        const date = normalizeNull(row.date)
        if (!date || !days.has(date)) continue
        const entrances = toInt(row.entrances)
        if (entrances <= 0) continue
        days.get(date)!.entryPages.push({
          entry_page: normalizeNull(row.entry_page),
          entrances,
        })
      }
    }

    const exitPagesFiles = csvs.get('exitPages')
    if (exitPagesFiles) {
      for await (const row of readDailyRows(exitPagesFiles)) {
        const date = normalizeNull(row.date)
        if (!date || !days.has(date)) continue
        const exits = toInt(row.exits)
        if (exits <= 0) continue
        days.get(date)!.exitPages.push({
          exit_page: normalizeNull(row.exit_page),
          exits,
        })
      }
    }

    const customEventsFiles = csvs.get('customEvents')
    if (customEventsFiles) {
      for await (const row of readDailyRows(customEventsFiles)) {
        const date = normalizeNull(row.date)
        if (!date || !days.has(date)) continue
        const name = normalizeNull(row.name)
        const events = toInt(row.events, 'events')
        if (!name || events <= 0) continue
        days
          .get(date)!
          .customEvents.push({ name, events, url: normalizeNull(row.link_url) })
      }
    }

    return days
  }

  async *createRowStream(
    filePath: string,
    pid: string,
    importID: number,
  ): AsyncIterable<AnalyticsImportRow> {
    const tempDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'swetrix-plausible-'),
    )
    try {
      const csvs = await this.extractCsvs(filePath, tempDir)
      const partitions = await this.partitionCsvs(csvs, tempDir)
      let yielded = 0
      let processedDays = 0
      for (const date of Array.from(partitions.keys()).sort()) {
        const files = partitions.get(date)!
        if (!files.has('visitors')) continue
        const days = await this.buildDailyData(files)
        for (const daily of days.values()) {
          processedDays++
          const events = daily.customEvents.reduce(
            (total, event) => total + event.events,
            0,
          )
          if (
            daily.visitors.visits > MAX_SESSIONS_PER_DAY ||
            events > MAX_EVENTS_PER_DAY ||
            daily.visitors.pageviews >
              Math.max(daily.visitors.visits, 1) * MAX_PAGEVIEWS_PER_SESSION
          ) {
            throw new ImportError(
              `Plausible data for ${date} exceeds the daily event processing limits. Please contact support.`,
            )
          }
          if (
            yielded + daily.visitors.pageviews + events >
            MAX_GENERATED_ROWS_PER_IMPORT
          ) {
            throw new ImportError(
              `Plausible export would generate more than ${MAX_GENERATED_ROWS_PER_IMPORT} rows. Please export a shorter date range.`,
            )
          }
          for (const row of this.synthesizeDay(daily, pid, importID)) {
            yielded++
            if (yielded % 5000 === 0)
              await new Promise<void>((resolve) => setImmediate(resolve))
            yield row
          }
        }
        for (const paths of files.values()) {
          for (const filePath of paths) await fs.promises.unlink(filePath)
        }
      }
      if (!processedDays)
        throw new ImportError('Plausible export contains no valid daily rows.')
    } finally {
      await fs.promises.rm(tempDir, { recursive: true, force: true })
    }
  }

  private *synthesizeDay(
    daily: DailyData,
    pid: string,
    importID: number,
  ): Iterable<AnalyticsImportRow> {
    const { date } = daily.visitors
    const visits = Math.min(
      Math.max(daily.visitors.visits, 0),
      MAX_SESSIONS_PER_DAY,
    )
    const pageviews = Math.max(daily.visitors.pageviews, 0)

    if (pageviews === 0 && daily.customEvents.length === 0) return

    const sessionCount =
      visits > 0
        ? visits
        : pageviews > 0 || daily.customEvents.length > 0
          ? 1
          : 0
    if (sessionCount === 0) return

    const pools = buildPools(daily, importID, date)
    const fallbackHost = pickSiteHostname(daily.pages)
    const dayStartSec = dateToEpochSec(date)
    const dayEndSec = dayStartSec + 86399
    const sessionSpacingSec =
      sessionCount > 1 ? Math.floor(86400 / sessionCount) : 86400

    const cappedPageviews = Math.min(
      pageviews,
      sessionCount * MAX_PAGEVIEWS_PER_SESSION,
    )
    const basePerSession = Math.min(
      Math.floor(cappedPageviews / sessionCount),
      MAX_PAGEVIEWS_PER_SESSION,
    )
    const remainder = cappedPageviews % sessionCount

    const avgVisitDuration =
      sessionCount > 0 ? daily.visitors.visit_duration / sessionCount : 0

    interface SessionInfo {
      psid: string
      browser: BrowserRow | null
      device: DeviceRow | null
      os: OsRow | null
      location: LocationRow | null
      source: SourceRow | null
      host: string | null
      startSec: number
    }

    const sessions: SessionInfo[] = []

    for (let i = 0; i < sessionCount; i++) {
      const psid = sessionIdToPsid(`${importID}|${date}|${i}`)

      const browser = pickFromPool(pools.browsers, i)
      const device = pickFromPool(pools.devices, i)
      const os = pickFromPool(pools.os, i)
      const location = pickFromPool(pools.locations, i)
      const source = pickFromPool(pools.sources, i)

      const startSec = dayStartSec + Math.floor((i * 86400) / sessionCount)

      sessions.push({
        psid,
        browser,
        device,
        os,
        location,
        source,
        host: fallbackHost,
        startSec,
      })
    }

    let middlePageIdx = 0

    for (let i = 0; i < sessions.length; i++) {
      const session = sessions[i]
      const pvCount = basePerSession + (i < remainder ? 1 : 0)
      if (pvCount <= 0) continue

      const entryPage = pickFromPool(pools.entryPages, i)
      const exitPage = pickFromPool(pools.exitPages, i)

      const pages: PageRow[] = []
      const entryPagePath = entryPage?.entry_page ?? null
      const exitPagePath = exitPage?.exit_page ?? null

      for (let j = 0; j < pvCount; j++) {
        if (j === 0 && entryPagePath) {
          pages.push({
            hostname: session.host,
            page: entryPagePath,
            pageviews: 1,
          })
          continue
        }
        if (j === pvCount - 1 && pvCount > 1 && exitPagePath) {
          pages.push({
            hostname: session.host,
            page: exitPagePath,
            pageviews: 1,
          })
          continue
        }
        const sampled = pickFromPool(pools.pages, middlePageIdx++)
        if (sampled) {
          pages.push(sampled)
        } else if (entryPagePath || exitPagePath) {
          pages.push({
            hostname: session.host,
            page: entryPagePath ?? exitPagePath,
            pageviews: 1,
          })
        } else {
          pages.push({ hostname: session.host, page: '/', pageviews: 1 })
        }
      }

      let pageGapSec = MIN_PAGE_GAP_SEC
      if (pvCount > 1) {
        pageGapSec = Math.round(avgVisitDuration / Math.max(pvCount - 1, 1))
        if (pageGapSec < MIN_PAGE_GAP_SEC) pageGapSec = MIN_PAGE_GAP_SEC
        if (pageGapSec > MAX_PAGE_GAP_SEC) pageGapSec = MAX_PAGE_GAP_SEC
      }

      for (let j = 0; j < pages.length; j++) {
        const page = pages[j]
        const rawTsSec = session.startSec + j * pageGapSec
        const tsSec = rawTsSec > dayEndSec ? dayEndSec : rawTsSec
        const created = formatDateTime(tsSec)

        const data = this.buildEventData({
          pid,
          importID,
          psid: session.psid,
          browser: session.browser,
          device: session.device,
          os: session.os,
          location: session.location,
          source: session.source,
          host: page.hostname ?? session.host,
          page: page.page,
          created,
        })

        yield { type: 'pageview', data }
      }
    }

    if (daily.customEvents.length > 0 && sessions.length > 0) {
      for (const ev of daily.customEvents) {
        const eventSeed = seedFromString(`${importID}|${date}|ev|${ev.name}`)
        const evPrng = seededPrng(eventSeed)
        const eventCount = Math.min(Math.max(ev.events, 0), MAX_EVENTS_PER_DAY)

        for (let k = 0; k < eventCount; k++) {
          const sessionIdx = Math.floor(evPrng() * sessions.length)
          const session = sessions[Math.min(sessionIdx, sessions.length - 1)]
          const tsSec =
            session.startSec + Math.floor(evPrng() * sessionSpacingSec)
          const created = formatDateTime(tsSec)

          const data = this.buildEventData({
            pid,
            importID,
            psid: session.psid,
            browser: session.browser,
            device: session.device,
            os: session.os,
            location: session.location,
            source: session.source,
            host: session.host,
            page: null,
            created,
          })
          if (ev.name === 'Outbound Link: Click') {
            data.outbound_url = truncate(ev.url, 2048)
            yield { type: 'outbound', data }
          } else {
            data.event_name = truncate(ev.name, 256) || ''
            yield { type: 'custom_event', data }
          }
        }
      }
    }
  }

  private buildEventData(args: {
    pid: string
    importID: number
    psid: string
    browser: BrowserRow | null
    device: DeviceRow | null
    os: OsRow | null
    location: LocationRow | null
    source: SourceRow | null
    host: string | null
    page: string | null
    created: string
  }): Record<string, unknown> {
    const device = mapDevice(args.device?.device ?? null)
    const browser = mapBrowser(args.browser?.browser ?? null, device)
    const os = mapOS(args.os?.operating_system ?? null)

    const cc = args.location?.country
    const validCC = cc && /^[A-Z]{2}$/.test(cc) ? cc : null
    const rgc = parseRegion(args.location?.region ?? null)

    const ref = buildReferrer(
      args.source?.referrer ?? null,
      args.source?.source ?? null,
      args.host,
    )

    return {
      psid: args.psid,
      profileId: null,
      pid: args.pid,
      host: truncate(args.host, 253),
      pg: truncate(args.page, 2048),
      dv: device,
      br: truncate(browser, 30),
      brv: truncate(args.browser?.browser_version ?? null, 20),
      os: truncate(os, 25),
      osv: truncate(args.os?.operating_system_version ?? null, 20),
      lc: null,
      ref: truncate(ref, 2048),
      so: truncate(args.source?.utm_source ?? null, 256),
      me: truncate(args.source?.utm_medium ?? null, 256),
      ca: truncate(args.source?.utm_campaign ?? null, 256),
      te: truncate(args.source?.utm_term ?? null, 256),
      co: truncate(args.source?.utm_content ?? null, 256),
      cc: validCC,
      rg: null,
      rgc,
      ct: null,
      'meta.key': [],
      'meta.value': [],
      importID: args.importID,
      created: args.created,
    }
  }
}
