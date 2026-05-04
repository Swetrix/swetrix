import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { Unzip, UnzipInflate } from 'fflate'
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

const WEBSITE_EVENT_CSV = 'website_event.csv'
const MAX_UMAMI_CSV_BYTES = 512 * 1024 * 1024

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

export class UmamiMapper implements ImportMapper {
  readonly provider = 'umami'
  readonly expectedFileExtension = '.zip'

  private async extractCsvFromZip(zipPath: string): Promise<string> {
    const tempCsv = path.join(os.tmpdir(), `swetrix-umami-${Date.now()}.csv`)

    return new Promise((resolve, reject) => {
      const zipStream = fs.createReadStream(zipPath)
      const unzipper = new Unzip()

      unzipper.register(UnzipInflate)

      let settled = false
      let foundEntry = false
      let fileDescriptor: number | null = null
      let tempFileCreated = false
      let extractedBytes = 0
      let terminateEntry: (() => void) | null = null

      const cleanupTempCsv = () => {
        if (fileDescriptor !== null) {
          try {
            fs.closeSync(fileDescriptor)
          } catch {
            //
          }
          fileDescriptor = null
        }

        if (tempFileCreated) {
          try {
            fs.unlinkSync(tempCsv)
          } catch {
            //
          }
        }
      }

      const fail = (error: Error) => {
        if (settled) return
        settled = true
        terminateEntry?.()
        zipStream.destroy()
        cleanupTempCsv()
        reject(error)
      }

      const succeed = () => {
        if (settled) return
        settled = true
        if (fileDescriptor !== null) {
          try {
            fs.closeSync(fileDescriptor)
          } catch (error) {
            cleanupTempCsv()
            reject(error)
            return
          }
          fileDescriptor = null
        }
        zipStream.destroy()
        resolve(tempCsv)
      }

      unzipper.onfile = (file) => {
        if (path.basename(file.name) !== WEBSITE_EVENT_CSV || foundEntry) return

        foundEntry = true

        if (
          typeof file.originalSize === 'number' &&
          Number.isFinite(file.originalSize) &&
          file.originalSize > MAX_UMAMI_CSV_BYTES
        ) {
          fail(
            new ImportError(
              `${WEBSITE_EVENT_CSV} exceeds the ${MAX_UMAMI_CSV_BYTES} byte limit.`,
            ),
          )
          return
        }

        try {
          fileDescriptor = fs.openSync(tempCsv, 'wx')
          tempFileCreated = true
        } catch (error) {
          fail(error as Error)
          return
        }

        terminateEntry = file.terminate
        file.ondata = (error, chunk, final) => {
          if (error) {
            fail(error)
            return
          }

          extractedBytes += chunk.length
          if (extractedBytes > MAX_UMAMI_CSV_BYTES) {
            fail(
              new ImportError(
                `${WEBSITE_EVENT_CSV} exceeds the ${MAX_UMAMI_CSV_BYTES} byte limit.`,
              ),
            )
            return
          }

          try {
            fs.writeSync(fileDescriptor!, chunk)
          } catch (writeError) {
            fail(writeError as Error)
            return
          }

          if (final) {
            succeed()
          }
        }

        try {
          file.start()
        } catch (error) {
          fail(error as Error)
        }
      }

      zipStream.on('data', (chunk: Buffer) => {
        if (settled) return

        try {
          unzipper.push(
            new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength),
          )
        } catch (error) {
          fail(error as Error)
        }
      })

      zipStream.on('end', () => {
        if (settled) return

        try {
          unzipper.push(new Uint8Array(0), true)
        } catch (error) {
          fail(error as Error)
          return
        }

        if (!foundEntry) {
          fail(
            new ImportError(
              `ZIP does not contain ${WEBSITE_EVENT_CSV}. Please upload the export ZIP from Umami.`,
            ),
          )
        }
      })

      zipStream.on('error', (error) => {
        fail(error)
      })
    })
  }

  async *createRowStream(
    filePath: string,
    pid: string,
    importID: number,
  ): AsyncIterable<AnalyticsImportRow> {
    const csvPath = await this.extractCsvFromZip(filePath)

    let cleanedUp = false
    const cleanup = () => {
      if (!cleanedUp) {
        cleanedUp = true
        try {
          fs.unlinkSync(csvPath)
        } catch {
          //
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
          yield { type: 'pageview', data: baseData }
        } else {
          const eventName = truncate(normalizeNull(row.event_name), 256) || ''
          yield {
            type: 'custom_event',
            data: { ...baseData, event_name: eventName },
          }
        }
      }
    } finally {
      cleanup()
    }
  }
}
