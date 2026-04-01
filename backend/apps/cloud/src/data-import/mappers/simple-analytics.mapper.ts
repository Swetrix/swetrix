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

const ISO_DATE_REGEX =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})$/
const REQUIRED_COLUMNS = ['added_iso', 'datapoint', 'session_id'] as const

function validateHeaders(headers: string[]): string[] {
  const normalizedHeaders = headers.map((header) => header.trim())
  const missingColumns = REQUIRED_COLUMNS.filter(
    (column) => !normalizedHeaders.includes(column),
  )

  if (missingColumns.length > 0) {
    throw new ImportError(
      `CSV does not appear to be a Simple Analytics export. Missing required columns: ${missingColumns.join(', ')}.`,
    )
  }

  return normalizedHeaders
}

function isoToClickHouseDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''

  const yyyy = d.getUTCFullYear()
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const mi = String(d.getUTCMinutes()).padStart(2, '0')
  const ss = String(d.getUTCSeconds()).padStart(2, '0')

  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`
}

function mapBrowserForDevice(
  browser: string | null,
  device: string | null,
): string | null {
  if (!browser) return null

  const isMobile = device === 'mobile' || device === 'tablet'
  if (isMobile && MOBILE_BROWSER_VARIANTS[browser]) {
    return MOBILE_BROWSER_VARIANTS[browser]
  }

  return browser
}

function filterSelfReferrer(
  referrer: string | null,
  hostname: string | null,
): string | null {
  if (!referrer) return null

  try {
    const url = new URL(referrer)
    if (hostname) {
      const cleanRef = url.hostname.replace(/^www\./, '')
      const cleanHost = hostname.replace(/^www\./, '')
      if (cleanRef === cleanHost) return null
    }
    return referrer
  } catch {
    return referrer
  }
}

function buildLocale(
  lang: string | null,
  region: string | null,
): string | null {
  if (!lang) return null
  if (region) return `${lang}-${region.toUpperCase()}`
  return lang
}

export class SimpleAnalyticsMapper implements ImportMapper {
  readonly provider = 'simple-analytics'
  readonly expectedFileExtension = '.csv'

  async *createRowStream(
    filePath: string,
    pid: string,
    importID: number,
  ): AsyncIterable<AnalyticsImportRow> {
    let headerChecked = false

    const parser = fs.createReadStream(filePath).pipe(
      parse({
        bom: true,
        columns: (headers) => {
          headerChecked = true
          return validateHeaders(headers)
        },
        skip_empty_lines: true,
        trim: true,
        relax_quotes: true,
        relax_column_count: true,
      }),
    )

    for await (const row of parser) {
      if (row.is_robot === 'true') continue

      const addedIso = normalizeNull(row.added_iso)
      if (!addedIso || !ISO_DATE_REGEX.test(addedIso)) continue

      const created = isoToClickHouseDateTime(addedIso)
      if (!created) continue

      const sessionId = normalizeNull(row.session_id)
      if (!sessionId) continue

      const psid = sessionIdToPsid(sessionId)
      const device = normalizeNull(row.device_type) || 'desktop'
      const hostname = truncate(normalizeNull(row.hostname), 253)
      const browser = mapBrowserForDevice(
        normalizeNull(row.browser_name),
        device,
      )
      const ref = filterSelfReferrer(
        normalizeNull(row.document_referrer),
        hostname,
      )

      const cc = normalizeNull(row.country_code)?.toUpperCase() || null
      const validCC = cc && /^[A-Z]{2}$/.test(cc) ? cc : null

      const locale = buildLocale(
        normalizeNull(row.lang_language),
        normalizeNull(row.lang_region),
      )

      const baseData: Record<string, unknown> = {
        psid,
        profileId: null,
        pid,
        host: hostname,
        pg: truncate(normalizeNull(row.path), 2048),
        dv: device,
        br: truncate(browser, 30),
        brv: truncate(normalizeNull(row.browser_version), 20),
        os: truncate(normalizeNull(row.os_name), 25),
        osv: truncate(normalizeNull(row.os_version), 20),
        lc: truncate(locale, 35),
        ref: truncate(ref, 2048),
        so: truncate(normalizeNull(row.utm_source), 256),
        me: truncate(normalizeNull(row.utm_medium), 256),
        ca: truncate(normalizeNull(row.utm_campaign), 256),
        te: truncate(normalizeNull(row.utm_term), 256),
        co: truncate(normalizeNull(row.utm_content), 256),
        cc: validCC,
        rg: null,
        rgc: null,
        ct: null,
        'meta.key': [],
        'meta.value': [],
        importID,
        created,
      }

      const datapoint = normalizeNull(row.datapoint)

      if (!datapoint || datapoint === 'pageview') {
        yield { table: 'analytics', data: baseData }
      } else {
        yield {
          table: 'customEV',
          data: { ...baseData, ev: truncate(datapoint, 256) || '' },
        }
      }
    }

    if (!headerChecked) {
      throw new ImportError(
        'CSV appears empty or is missing a header row. Please upload the raw CSV export from Simple Analytics.',
      )
    }
  }
}
