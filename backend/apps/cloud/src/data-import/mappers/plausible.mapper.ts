import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import { unzipSync } from 'fflate'
import { parse as parseSync } from 'csv-parse/sync'

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
const MAX_CSV_BYTES = 50 * 1024 * 1024
const MIN_PAGE_GAP_SEC = 5
const MAX_PAGE_GAP_SEC = 30 * 60
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

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

function toInt(value: string | undefined): number {
  if (!value) return 0
  const n = parseInt(value, 10)
  return Number.isFinite(n) ? n : 0
}

function parseCsv(bytes: Uint8Array): Record<string, string>[] {
  if (bytes.length > MAX_CSV_BYTES) {
    throw new ImportError(
      `Plausible export contains a CSV larger than ${MAX_CSV_BYTES} bytes.`,
    )
  }
  return parseSync(Buffer.from(bytes), {
    bom: true,
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_quotes: true,
    relax_column_count: true,
  }) as Record<string, string>[]
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

class WeightedDist<T> {
  readonly items: T[]
  readonly cumulative: number[]
  readonly total: number

  constructor(items: T[], weights: number[]) {
    const safeItems: T[] = []
    const safeWeights: number[] = []
    for (let i = 0; i < items.length; i++) {
      const w = weights[i]
      if (w > 0) {
        safeItems.push(items[i])
        safeWeights.push(w)
      }
    }
    this.items = safeItems
    this.cumulative = []
    let acc = 0
    for (const w of safeWeights) {
      acc += w
      this.cumulative.push(acc)
    }
    this.total = acc
  }

  get isEmpty(): boolean {
    return this.items.length === 0
  }

  sample(prng: () => number): T | null {
    if (this.items.length === 0) return null
    const r = prng() * this.total
    let lo = 0
    let hi = this.cumulative.length - 1
    while (lo < hi) {
      const mid = (lo + hi) >>> 1
      if (this.cumulative[mid] >= r) {
        hi = mid
      } else {
        lo = mid + 1
      }
    }
    return this.items[lo]
  }
}

interface DistBundle {
  browsers: WeightedDist<BrowserRow>
  devices: WeightedDist<DeviceRow>
  os: WeightedDist<OsRow>
  locations: WeightedDist<LocationRow>
  sources: WeightedDist<SourceRow>
  pages: WeightedDist<PageRow>
  entryPages: WeightedDist<EntryPageRow>
  exitPages: WeightedDist<ExitPageRow>
}

function buildDists(daily: DailyData): DistBundle {
  return {
    browsers: new WeightedDist(
      daily.browsers,
      daily.browsers.map((r) => r.visits),
    ),
    devices: new WeightedDist(
      daily.devices,
      daily.devices.map((r) => r.visits),
    ),
    os: new WeightedDist(
      daily.os,
      daily.os.map((r) => r.visits),
    ),
    locations: new WeightedDist(
      daily.locations,
      daily.locations.map((r) => r.visits),
    ),
    sources: new WeightedDist(
      daily.sources,
      daily.sources.map((r) => r.visits),
    ),
    pages: new WeightedDist(
      daily.pages,
      daily.pages.map((r) => r.pageviews),
    ),
    entryPages: new WeightedDist(
      daily.entryPages,
      daily.entryPages.map((r) => r.entrances),
    ),
    exitPages: new WeightedDist(
      daily.exitPages,
      daily.exitPages.map((r) => r.exits),
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

  private extractCsvs(zipPath: string): Map<string, Uint8Array> {
    const stat = fs.statSync(zipPath)
    if (stat.size > MAX_PLAUSIBLE_ZIP_BYTES) {
      throw new ImportError(
        `Plausible ZIP exceeds the ${MAX_PLAUSIBLE_ZIP_BYTES} byte limit.`,
      )
    }

    const buf = fs.readFileSync(zipPath)
    let entries: Record<string, Uint8Array>
    try {
      entries = unzipSync(
        new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength),
      )
    } catch {
      throw new ImportError(
        'Could not read the uploaded file as a ZIP archive. Please upload the export ZIP from Plausible.',
      )
    }

    const found = new Map<string, Uint8Array>()
    for (const [name, data] of Object.entries(entries)) {
      const base = path.basename(name).toLowerCase()
      if (!base.endsWith('.csv')) continue
      for (const [key, pattern] of Object.entries(FILE_PATTERNS)) {
        if (found.has(key)) continue
        if (pattern.test(name)) {
          found.set(key, data)
          break
        }
      }
    }

    return found
  }

  private buildDailyData(
    csvs: Map<string, Uint8Array>,
  ): Map<string, DailyData> {
    const visitorsBytes = csvs.get('visitors')
    if (!visitorsBytes) {
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

    for (const row of parseCsv(visitorsBytes)) {
      const date = normalizeNull(row.date)
      if (!date || !DATE_REGEX.test(date)) continue
      const visits = toInt(row.visits)
      const pageviews = toInt(row.pageviews)
      if (visits <= 0 && pageviews <= 0) continue
      const day = ensureDay(date)
      day.visitors = {
        date,
        visitors: toInt(row.visitors),
        pageviews,
        visits,
        bounces: toInt(row.bounces),
        visit_duration: toInt(row.visit_duration),
      }
    }

    if (days.size === 0) {
      throw new ImportError(
        'imported_visitors_*.csv contains no valid daily rows.',
      )
    }

    const pagesBytes = csvs.get('pages')
    if (pagesBytes) {
      for (const row of parseCsv(pagesBytes)) {
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

    const browsersBytes = csvs.get('browsers')
    if (browsersBytes) {
      for (const row of parseCsv(browsersBytes)) {
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

    const devicesBytes = csvs.get('devices')
    if (devicesBytes) {
      for (const row of parseCsv(devicesBytes)) {
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

    const osBytes = csvs.get('operatingSystems')
    if (osBytes) {
      for (const row of parseCsv(osBytes)) {
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

    const locationsBytes = csvs.get('locations')
    if (locationsBytes) {
      for (const row of parseCsv(locationsBytes)) {
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

    const sourcesBytes = csvs.get('sources')
    if (sourcesBytes) {
      for (const row of parseCsv(sourcesBytes)) {
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

    const entryPagesBytes = csvs.get('entryPages')
    if (entryPagesBytes) {
      for (const row of parseCsv(entryPagesBytes)) {
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

    const exitPagesBytes = csvs.get('exitPages')
    if (exitPagesBytes) {
      for (const row of parseCsv(exitPagesBytes)) {
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

    const customEventsBytes = csvs.get('customEvents')
    if (customEventsBytes) {
      for (const row of parseCsv(customEventsBytes)) {
        const date = normalizeNull(row.date)
        if (!date || !days.has(date)) continue
        const name = normalizeNull(row.name)
        const events = toInt(row.events)
        if (!name || events <= 0) continue
        days.get(date)!.customEvents.push({ name, events })
      }
    }

    return days
  }

  async *createRowStream(
    filePath: string,
    pid: string,
    importID: number,
  ): AsyncIterable<AnalyticsImportRow> {
    const csvs = this.extractCsvs(filePath)
    const days = this.buildDailyData(csvs)
    const sortedDates = Array.from(days.keys()).sort()

    for (const date of sortedDates) {
      const daily = days.get(date)!
      yield* this.synthesizeDay(daily, pid, importID)
    }
  }

  private *synthesizeDay(
    daily: DailyData,
    pid: string,
    importID: number,
  ): Iterable<AnalyticsImportRow> {
    const { date } = daily.visitors
    const visits = Math.max(daily.visitors.visits, 0)
    const pageviews = Math.max(daily.visitors.pageviews, 0)

    if (pageviews === 0 && daily.customEvents.length === 0) return

    const sessionCount = visits > 0 ? visits : pageviews > 0 ? 1 : 0
    if (sessionCount === 0) return

    const dists = buildDists(daily)
    const fallbackHost = pickSiteHostname(daily.pages)
    const dayStartSec = dateToEpochSec(date)
    const sessionSpacingSec =
      sessionCount > 1 ? Math.floor(86400 / sessionCount) : 86400

    const basePerSession = Math.floor(pageviews / sessionCount)
    const remainder = pageviews % sessionCount

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
      const seed = seedFromString(`${importID}|${date}|${i}`)
      const prng = seededPrng(seed)
      const psid = sessionIdToPsid(`${importID}|${date}|${i}`)

      const browser = dists.browsers.sample(prng)
      const device = dists.devices.sample(prng)
      const os = dists.os.sample(prng)
      const location = dists.locations.sample(prng)
      const source = dists.sources.sample(prng)

      const startSec = dayStartSec + i * sessionSpacingSec

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

    for (let i = 0; i < sessions.length; i++) {
      const session = sessions[i]
      const pvCount = basePerSession + (i < remainder ? 1 : 0)
      if (pvCount <= 0) continue

      const seed = seedFromString(`${importID}|${date}|${i}|pages`)
      const prng = seededPrng(seed)

      const entryPage = dists.entryPages.sample(prng)
      const exitPage = dists.exitPages.sample(prng)

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
        const sampled = dists.pages.sample(prng)
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
        const tsSec = session.startSec + j * pageGapSec
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

        yield { table: 'analytics', data }
      }
    }

    if (daily.customEvents.length > 0 && sessions.length > 0) {
      for (const ev of daily.customEvents) {
        const eventSeed = seedFromString(`${importID}|${date}|ev|${ev.name}`)
        const evPrng = seededPrng(eventSeed)

        for (let k = 0; k < ev.events; k++) {
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
          data.ev = truncate(ev.name, 256) || ''
          yield { table: 'customEV', data }
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
