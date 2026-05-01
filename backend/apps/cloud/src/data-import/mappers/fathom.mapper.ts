import * as fs from 'fs'
import { parse } from 'csv-parse'

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

const DATETIME_REGEX =
  /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]) ([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/

const PAGEVIEW_MARKER = 'pageviews'
const EVENT_MARKER = 'event_name'

const COMMON_REQUIRED = ['datetime', 'hostname', 'pathname'] as const

const OS_MAP: Record<string, string> = {
  'os x': 'macOS',
  macos: 'macOS',
  'chrome os': 'Chrome OS',
  'chromium os': 'Chrome OS',
}

const DEVICE_MAP: Record<string, string> = {
  desktop: 'desktop',
  mobile: 'mobile',
  tablet: 'tablet',
  laptop: 'desktop',
}

type FathomFileType = 'pageviews' | 'events'

function detectFileType(headers: string[]): {
  type: FathomFileType
  normalized: string[]
} {
  const normalized = headers.map((h) => h.trim())

  const missing = COMMON_REQUIRED.filter((c) => !normalized.includes(c))
  if (missing.length > 0) {
    throw new ImportError(
      `CSV does not appear to be a Fathom Analytics export. Missing required columns: ${missing.join(', ')}.`,
    )
  }

  if (normalized.includes(PAGEVIEW_MARKER)) {
    return { type: 'pageviews', normalized }
  }

  if (normalized.includes(EVENT_MARKER)) {
    return { type: 'events', normalized }
  }

  throw new ImportError(
    'CSV does not appear to be a Fathom Analytics export. Expected a pageviews export (with "pageviews" column) or an events export (with "event_name" column).',
  )
}

function mapOS(raw: string | null): string | null {
  if (!raw) return null
  return OS_MAP[raw.toLowerCase()] ?? raw
}

function mapDevice(raw: string | null): string {
  if (!raw) return 'desktop'
  return DEVICE_MAP[raw.toLowerCase()] ?? 'desktop'
}

function mapBrowser(raw: string | null, device: string): string | null {
  if (!raw) return null

  const isMobile = device === 'mobile' || device === 'tablet'
  if (isMobile && MOBILE_BROWSER_VARIANTS[raw]) {
    return MOBILE_BROWSER_VARIANTS[raw]
  }

  return raw
}

function extractHostname(raw: string | null): string | null {
  if (!raw) return null

  try {
    return new URL(raw).hostname
  } catch {
    return raw
  }
}

function buildReferrer(
  hostname: string | null,
  pathname: string | null,
  siteHostname: string | null,
): string | null {
  if (!hostname) return null

  let ref = `https://${hostname}`
  if (pathname) ref += pathname

  if (siteHostname) {
    const cleanRef = hostname.replace(/^www\./, '')
    const cleanSite = siteHostname.replace(/^www\./, '')
    if (cleanRef === cleanSite) return null
  }

  return ref
}

function buildSessionSeed(row: Record<string, string>): string {
  return [
    row.datetime ?? '',
    row.browser ?? '',
    row.country_code ?? '',
    row.city ?? '',
    row.device_type ?? '',
    row.operating_system ?? '',
  ].join('|')
}

export class FathomMapper implements ImportMapper {
  readonly provider = 'fathom'
  readonly expectedFileExtension = '.csv'

  async *createRowStream(
    filePath: string,
    pid: string,
    importID: number,
  ): AsyncIterable<AnalyticsImportRow> {
    let fileType: FathomFileType | null = null
    let headerChecked = false

    const parser = fs.createReadStream(filePath).pipe(
      parse({
        bom: true,
        columns: (headers) => {
          const result = detectFileType(headers)
          fileType = result.type
          headerChecked = true
          return result.normalized
        },
        skip_empty_lines: true,
        trim: true,
        relax_quotes: true,
        relax_column_count: true,
      }),
    )

    for await (const row of parser) {
      const datetime = normalizeNull(row.datetime)
      if (!datetime || !DATETIME_REGEX.test(datetime)) continue

      const count = parseInt(
        fileType === 'pageviews' ? row.pageviews : row.completions,
        10,
      )
      if (!count || count <= 0) continue

      const device = mapDevice(normalizeNull(row.device_type))
      const browser = mapBrowser(normalizeNull(row.browser), device)
      const os = mapOS(normalizeNull(row.operating_system))
      const siteHost = extractHostname(normalizeNull(row.hostname))

      const cc = normalizeNull(row.country_code)?.toUpperCase() || null
      const validCC = cc && /^[A-Z]{2}$/.test(cc) ? cc : null

      const refHostname = normalizeNull(row.referrer_hostname)
      const refPathname = normalizeNull(row.referrer_pathname)
      const ref = buildReferrer(refHostname, refPathname, siteHost)

      const psid = sessionIdToPsid(buildSessionSeed(row))

      const baseData: Record<string, unknown> = {
        psid,
        profileId: null,
        pid,
        host: truncate(siteHost, 253),
        pg: truncate(normalizeNull(row.pathname), 2048),
        dv: device,
        br: truncate(browser, 30),
        brv: null,
        os: truncate(os, 25),
        osv: null,
        lc: null,
        ref: truncate(ref, 2048),
        so: truncate(normalizeNull(row.utm_source), 256),
        me: truncate(normalizeNull(row.utm_medium), 256),
        ca: truncate(normalizeNull(row.utm_campaign), 256),
        te: truncate(normalizeNull(row.utm_term), 256),
        co: truncate(normalizeNull(row.utm_content), 256),
        cc: validCC,
        rg: normalizeNull(row.state)?.slice(0, 10) || null,
        rgc: null,
        ct: truncate(normalizeNull(row.city), 60),
        'meta.key': [],
        'meta.value': [],
        importID,
        created: datetime,
      }

      if (fileType === 'pageviews') {
        for (let i = 0; i < count; i++) {
          yield { type: 'pageview', data: baseData }
        }
      } else {
        const eventName = truncate(normalizeNull(row.event_name), 256) || ''
        const evData = { ...baseData, event_name: eventName }
        for (let i = 0; i < count; i++) {
          yield { type: 'custom_event', data: evData }
        }
      }
    }

    if (!headerChecked) {
      throw new ImportError(
        'CSV appears empty or is missing a header row. Please upload a CSV export from Fathom Analytics.',
      )
    }
  }
}
