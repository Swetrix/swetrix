import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import * as crypto from 'crypto'
import { unzipSync } from 'fflate'
import { parse } from 'csv-parse'

import { ImportMapper, AnalyticsImportRow } from './mapper.interface'

const WEBSITE_EVENT_CSV = 'website_event.csv'

const BROWSER_MAP: Record<string, string> = {
  chrome: 'Chrome',
  opera: 'Opera',
  crios: 'Mobile Chrome',
  firefox: 'Firefox',
  facebook: 'Facebook',
  safari: 'Safari',
  ios: 'Mobile Safari',
  'ios-webview': 'Mobile Safari',
  'edge-chromium': 'Edge',
  samsung: 'Samsung Internet',
  yandexbrowser: 'Yandex',
  'edge-ios': 'Edge',
  'chromium-webview': 'Chrome WebView',
  fxios: 'Mobile Firefox',
  edge: 'Edge',
}

const MOBILE_BROWSER_VARIANTS: Record<string, string> = {
  Chrome: 'Mobile Chrome',
  Firefox: 'Mobile Firefox',
  Safari: 'Mobile Safari',
}

const OS_MAP: Record<string, string> = {
  'mac os': 'macOS',
  'windows 10': 'Windows',
  'windows 7': 'Windows',
  'windows 8': 'Windows',
  'windows 8.1': 'Windows',
  'windows vista': 'Windows',
  'windows xp': 'Windows',
  'windows server 2003': 'Windows',
  'android os': 'Android',
  'chrome os': 'Chrome OS',
  'chromium os': 'Chrome OS',
}

const DEVICE_MAP: Record<string, string> = {
  laptop: 'desktop',
  desktop: 'desktop',
  mobile: 'mobile',
  tablet: 'tablet',
}

function normalizeNull(value: string | undefined): string | null {
  if (!value || value === '' || value === '\\N') return null
  return value
}

function truncate(value: string | null, maxLen: number): string | null {
  if (!value) return null
  return value.length > maxLen ? value.slice(0, maxLen) : value
}

function mapBrowser(raw: string | null, device: string | null): string | null {
  if (!raw) return null

  const key = raw.toLowerCase()
  let mapped = BROWSER_MAP[key]

  if (!mapped) {
    mapped = raw.charAt(0).toUpperCase() + raw.slice(1)
  }

  const isMobile = device === 'mobile' || device === 'tablet'
  if (isMobile && MOBILE_BROWSER_VARIANTS[mapped]) {
    return MOBILE_BROWSER_VARIANTS[mapped]
  }

  return mapped
}

function mapOS(raw: string | null): string | null {
  if (!raw) return null
  const key = raw.toLowerCase()
  return OS_MAP[key] ?? raw
}

function mapDevice(raw: string | null): string {
  if (!raw) return 'desktop'
  const key = raw.toLowerCase()
  return DEVICE_MAP[key] ?? 'desktop'
}

function buildReferrer(
  domain: string | null,
  path: string | null,
  query: string | null,
  hostname: string | null,
): string | null {
  if (!domain) return null

  let ref = `https://${domain}`
  if (path) ref += path
  if (query) ref += query.startsWith('?') ? query : `?${query}`

  if (hostname) {
    const cleanHost = hostname.replace(/^www\./, '')
    const cleanDomain = domain.replace(/^www\./, '')
    if (cleanDomain === cleanHost) return null
  }

  return ref
}

const DATE_REGEX =
  /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]) ([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/

function isValidTimestamp(ts: string): boolean {
  return DATE_REGEX.test(ts)
}

function sessionIdToPsid(sessionId: string): string {
  return crypto
    .createHash('sha256')
    .update(sessionId)
    .digest()
    .readBigUInt64BE(0)
    .toString()
}

export class UmamiMapper implements ImportMapper {
  readonly provider = 'umami'
  readonly expectedFileExtension = '.zip'

  private extractCsvFromZip(zipPath: string): string {
    const zipBuffer = fs.readFileSync(zipPath)
    const files = unzipSync(new Uint8Array(zipBuffer))

    const matchKey = Object.keys(files).find((name) => {
      const basename = name.split('/').pop() || name
      return basename === WEBSITE_EVENT_CSV
    })

    if (!matchKey) {
      throw new Error(
        `ZIP does not contain ${WEBSITE_EVENT_CSV}. Please upload the export ZIP from Umami.`,
      )
    }

    const tempCsv = path.join(os.tmpdir(), `swetrix-umami-${Date.now()}.csv`)
    fs.writeFileSync(tempCsv, Buffer.from(files[matchKey]))
    return tempCsv
  }

  async *createRowStream(
    filePath: string,
    pid: string,
    importID: number,
  ): AsyncIterable<AnalyticsImportRow> {
    const csvPath = this.extractCsvFromZip(filePath)

    let cleanedUp = false
    const cleanup = () => {
      if (!cleanedUp) {
        cleanedUp = true
        try {
          fs.unlinkSync(csvPath)
        } catch {
          // ignore
        }
      }
    }

    try {
      const parser = fs.createReadStream(csvPath).pipe(
        parse({
          columns: true,
          skip_empty_lines: true,
          trim: true,
          relax_quotes: true,
          relax_column_count: true,
        }),
      )

      for await (const row of parser) {
        const sessionId = normalizeNull(row.session_id)
        if (!sessionId) continue

        const createdAt = normalizeNull(row.created_at)
        if (!createdAt || !isValidTimestamp(createdAt)) continue

        const eventType = normalizeNull(row.event_type)
        if (!eventType || (eventType !== '1' && eventType !== '2')) continue

        const psid = sessionIdToPsid(sessionId)

        const rawDevice = normalizeNull(row.device)
        const device = mapDevice(rawDevice)
        const browser = mapBrowser(normalizeNull(row.browser), rawDevice)
        const os = mapOS(normalizeNull(row.os))

        const hostname = truncate(normalizeNull(row.hostname), 253)
        const referrerDomain = normalizeNull(row.referrer_domain)
        const referrerPath = normalizeNull(row.referrer_path)
        const referrerQuery = normalizeNull(row.referrer_query)
        const ref = buildReferrer(
          referrerDomain,
          referrerPath,
          referrerQuery,
          hostname,
        )

        const country = normalizeNull(row.country)
        const cc = country && /^[A-Z]{2}$/.test(country) ? country : null

        const region = normalizeNull(row.region)

        const baseData: Record<string, unknown> = {
          psid,
          profileId: null,
          pid,
          host: hostname,
          pg: truncate(normalizeNull(row.url_path), 2048),
          dv: device,
          br: truncate(browser, 30),
          brv: null,
          os: truncate(os, 25),
          osv: null,
          lc: truncate(normalizeNull(row.language), 35),
          ref: truncate(ref, 2048),
          so: truncate(normalizeNull(row.utm_source), 256),
          me: truncate(normalizeNull(row.utm_medium), 256),
          ca: truncate(normalizeNull(row.utm_campaign), 256),
          te: truncate(normalizeNull(row.utm_term), 256),
          co: truncate(normalizeNull(row.utm_content), 256),
          cc,
          rg: null,
          rgc: region && region.length <= 10 ? region : null,
          ct: truncate(normalizeNull(row.city), 60),
          'meta.key': [],
          'meta.value': [],
          importID,
          created: createdAt,
        }

        if (eventType === '1') {
          yield { table: 'analytics', data: baseData }
        } else {
          const eventName = truncate(normalizeNull(row.event_name), 256) || ''
          yield {
            table: 'customEV',
            data: { ...baseData, ev: eventName },
          }
        }
      }
    } finally {
      cleanup()
    }
  }
}
