import { BetaAnalyticsDataClient } from '@google-analytics/data'
import { OAuth2Client } from 'google-auth-library'
import CryptoJS from 'crypto-js'
import dayjs from 'dayjs'

import {
  ImportMapper,
  ImportError,
  AnalyticsImportRow,
} from './mapper.interface'
import {
  truncate,
  sessionIdToPsid,
  MOBILE_BROWSER_VARIANTS,
} from './mapper.utils'
import { deriveKey } from '../../common/utils'

const ENCRYPTION_KEY = deriveKey('ga4-token')

const PAGE_SIZE = 100_000

const EXCLUDED_EVENTS = new Set([
  'page_view',
  'session_start',
  'first_visit',
  'scroll',
  'click',
  'file_download',
  'form_start',
  'form_submit',
  'view_search_results',
  'video_start',
  'video_progress',
  'video_complete',
])

const DEVICE_MAP: Record<string, string> = {
  desktop: 'desktop',
  mobile: 'mobile',
  tablet: 'tablet',
}

function mapDevice(raw: string | null): string {
  if (!raw) return 'desktop'
  return DEVICE_MAP[raw.toLowerCase()] ?? 'desktop'
}

function mapBrowser(raw: string | null, device: string): string | null {
  if (!raw || raw === '(not set)') return null
  const isMobile = device === 'mobile' || device === 'tablet'
  if (isMobile && MOBILE_BROWSER_VARIANTS[raw]) {
    return MOBILE_BROWSER_VARIANTS[raw]
  }
  return raw
}

function mapOS(raw: string | null): string | null {
  if (!raw || raw === '(not set)') return null
  if (raw === 'Macintosh') return 'macOS'
  return raw
}

function normalizeGA4Value(val: string | null | undefined): string | null {
  if (!val || val === '(not set)' || val === '(none)' || val === '(direct)') {
    return null
  }
  return val
}

function buildReferrer(source: string | null): string | null {
  if (!source) return null
  if (source.includes('://')) return source
  if (source.includes('.')) return `https://${source}`
  return null
}

function decryptToken(encrypted: string): string {
  const bytes = CryptoJS.Rabbit.decrypt(encrypted, ENCRYPTION_KEY)
  return bytes.toString(CryptoJS.enc.Utf8)
}

function getMonthChunks(
  startDate: string,
  endDate: string,
): { start: string; end: string }[] {
  const chunks: { start: string; end: string }[] = []
  let current = dayjs(startDate)
  const end = dayjs(endDate)

  while (current.isBefore(end) || current.isSame(end, 'day')) {
    const monthEnd = current.endOf('month')
    const chunkEnd = monthEnd.isAfter(end) ? end : monthEnd
    chunks.push({
      start: current.format('YYYY-MM-DD'),
      end: chunkEnd.format('YYYY-MM-DD'),
    })
    current = chunkEnd.add(1, 'day')
  }

  return chunks
}

interface SourceInfo {
  so: string | null
  me: string | null
  ca: string | null
  te: string | null
  co: string | null
  ref: string | null
}

export class Ga4Mapper implements ImportMapper {
  readonly provider = 'google-analytics'
  readonly expectedFileExtension = null

  async *createRowStream(
    _filePath: string | null,
    pid: string,
    importID: number,
    context?: Record<string, unknown>,
  ): AsyncIterable<AnalyticsImportRow> {
    if (
      !context?.encryptedRefreshToken ||
      !context?.ga4PropertyId ||
      !context?.ga4ClientId ||
      !context?.ga4ClientSecret
    ) {
      throw new ImportError(
        'GA4 import requires OAuth credentials and a property ID.',
      )
    }

    const refreshToken = decryptToken(context.encryptedRefreshToken as string)
    const propertyId = context.ga4PropertyId as string
    const clientId = context.ga4ClientId as string
    const clientSecret = context.ga4ClientSecret as string

    const oauth2Client = new OAuth2Client(clientId, clientSecret)
    oauth2Client.setCredentials({ refresh_token: refreshToken })

    const client = new BetaAnalyticsDataClient({
      authClient: oauth2Client as any,
    })
    const property = propertyId.startsWith('properties/')
      ? propertyId
      : `properties/${propertyId}`

    const startDate = (context.startDate as string) || '2020-01-01'
    const endDate = (context.endDate as string) || dayjs().format('YYYY-MM-DD')
    const chunks = getMonthChunks(startDate, endDate)

    for (const chunk of chunks) {
      const sourceLookup = await this.buildSourceLookup(client, property, chunk)
      yield* this.fetchPageviews(
        client,
        property,
        chunk,
        pid,
        importID,
        sourceLookup,
      )
      yield* this.fetchCustomEvents(client, property, chunk, pid, importID)
    }
  }

  /**
   * Fetches source/UTM data into a lookup map keyed by (dateHour|hostName|pagePath).
   * Kept in memory per monthly chunk -- the map stores only the highest-traffic
   * source combo for each key, so memory stays bounded.
   */
  private async buildSourceLookup(
    client: BetaAnalyticsDataClient,
    property: string,
    dateRange: { start: string; end: string },
  ): Promise<Map<string, SourceInfo>> {
    const lookup = new Map<string, SourceInfo & { count: number }>()
    let offset = 0

    while (true) {
      const [report] = await client.runReport({
        property,
        dateRanges: [{ startDate: dateRange.start, endDate: dateRange.end }],
        dimensions: [
          { name: 'dateHour' },
          { name: 'hostName' },
          { name: 'pagePath' },
          { name: 'sessionSource' },
          { name: 'sessionMedium' },
          { name: 'sessionCampaignName' },
          { name: 'sessionManualTerm' },
          { name: 'sessionManualAdContent' },
        ],
        metrics: [{ name: 'screenPageViews' }],
        limit: PAGE_SIZE,
        offset,
        keepEmptyRows: false,
      })

      const rows = report.rows || []
      if (rows.length === 0) break

      for (const row of rows) {
        const dims = row.dimensionValues || []
        const metrics = row.metricValues || []

        const dateHour = dims[0]?.value || ''
        const host = dims[1]?.value || ''
        const pagePath = dims[2]?.value || ''
        const source = normalizeGA4Value(dims[3]?.value)
        const medium = normalizeGA4Value(dims[4]?.value)
        const campaign = normalizeGA4Value(dims[5]?.value)
        const term = normalizeGA4Value(dims[6]?.value)
        const content = normalizeGA4Value(dims[7]?.value)

        const count = parseInt(metrics[0]?.value || '0', 10)
        if (count <= 0) continue

        const key = `${dateHour}|${host}|${pagePath}`
        const existing = lookup.get(key)

        if (!existing || count > existing.count) {
          lookup.set(key, {
            so: source,
            me: medium,
            ca: campaign,
            te: term,
            co: content,
            ref: buildReferrer(source),
            count,
          })
        }
      }

      if (rows.length < PAGE_SIZE) break
      offset += PAGE_SIZE
    }

    return lookup
  }

  private async *fetchPageviews(
    client: BetaAnalyticsDataClient,
    property: string,
    dateRange: { start: string; end: string },
    pid: string,
    importID: number,
    sourceLookup: Map<string, SourceInfo>,
  ): AsyncIterable<AnalyticsImportRow> {
    let offset = 0

    while (true) {
      const [report] = await client.runReport({
        property,
        dateRanges: [{ startDate: dateRange.start, endDate: dateRange.end }],
        dimensions: [
          { name: 'dateHour' },
          { name: 'hostName' },
          { name: 'pagePath' },
          { name: 'deviceCategory' },
          { name: 'browser' },
          { name: 'operatingSystem' },
          { name: 'countryId' },
          { name: 'region' },
          { name: 'city' },
        ],
        metrics: [{ name: 'screenPageViews' }],
        limit: PAGE_SIZE,
        offset,
        keepEmptyRows: false,
      })

      const rows = report.rows || []
      if (rows.length === 0) break

      for (const row of rows) {
        const dims = row.dimensionValues || []
        const metrics = row.metricValues || []

        const dateHour = dims[0]?.value || ''
        const host = normalizeGA4Value(dims[1]?.value)
        const pagePath = normalizeGA4Value(dims[2]?.value)
        const deviceRaw = dims[3]?.value || null
        const browserRaw = dims[4]?.value || null
        const osRaw = dims[5]?.value || null
        const countryId = normalizeGA4Value(dims[6]?.value)
        const regionRaw = normalizeGA4Value(dims[7]?.value)
        const cityRaw = normalizeGA4Value(dims[8]?.value)

        const count = parseInt(metrics[0]?.value || '0', 10)
        if (count <= 0) continue

        const created = this.parseGA4DateHour(dateHour)
        if (!created) continue

        const device = mapDevice(deviceRaw)
        const browser = mapBrowser(browserRaw, device)
        const os = mapOS(osRaw)
        const cc = countryId && /^[A-Z]{2}$/.test(countryId) ? countryId : null

        // Enrich with source/UTM data from lookup
        const sourceKey = `${dateHour}|${host || ''}|${pagePath || ''}`
        const sourceInfo = sourceLookup.get(sourceKey)

        const sessionSeed = [
          dateHour,
          host,
          pagePath,
          deviceRaw,
          browserRaw,
          osRaw,
          countryId,
          regionRaw,
          cityRaw,
        ].join('|')
        const psid = sessionIdToPsid(sessionSeed)

        const data: Record<string, unknown> = {
          psid,
          profileId: null,
          pid,
          host: truncate(host, 253),
          pg: truncate(pagePath, 2048),
          dv: device,
          br: truncate(browser, 30),
          brv: null,
          os: truncate(os, 25),
          osv: null,
          lc: null,
          ref: truncate(sourceInfo?.ref ?? null, 2048),
          so: truncate(sourceInfo?.so ?? null, 256),
          me: truncate(sourceInfo?.me ?? null, 256),
          ca: truncate(sourceInfo?.ca ?? null, 256),
          te: truncate(sourceInfo?.te ?? null, 256),
          co: truncate(sourceInfo?.co ?? null, 256),
          cc,
          rg: null,
          rgc: truncate(regionRaw, 100),
          ct: truncate(cityRaw, 60),
          'meta.key': [],
          'meta.value': [],
          importID,
          created,
        }

        for (let i = 0; i < count; i++) {
          yield { table: 'analytics', data }
        }
      }

      if (rows.length < PAGE_SIZE) break
      offset += PAGE_SIZE
    }
  }

  private async *fetchCustomEvents(
    client: BetaAnalyticsDataClient,
    property: string,
    dateRange: { start: string; end: string },
    pid: string,
    importID: number,
  ): AsyncIterable<AnalyticsImportRow> {
    let offset = 0

    while (true) {
      const [report] = await client.runReport({
        property,
        dateRanges: [{ startDate: dateRange.start, endDate: dateRange.end }],
        dimensions: [
          { name: 'dateHour' },
          { name: 'eventName' },
          { name: 'pagePath' },
          { name: 'deviceCategory' },
          { name: 'browser' },
          { name: 'operatingSystem' },
          { name: 'countryId' },
          { name: 'hostName' },
        ],
        metrics: [{ name: 'eventCount' }],
        limit: PAGE_SIZE,
        offset,
        keepEmptyRows: false,
      })

      const rows = report.rows || []
      if (rows.length === 0) break

      for (const row of rows) {
        const dims = row.dimensionValues || []
        const metrics = row.metricValues || []

        const dateHour = dims[0]?.value || ''
        const eventName = dims[1]?.value || ''
        const pagePath = normalizeGA4Value(dims[2]?.value)
        const deviceRaw = dims[3]?.value || null
        const browserRaw = dims[4]?.value || null
        const osRaw = dims[5]?.value || null
        const countryId = normalizeGA4Value(dims[6]?.value)
        const host = normalizeGA4Value(dims[7]?.value)

        if (EXCLUDED_EVENTS.has(eventName)) continue

        const count = parseInt(metrics[0]?.value || '0', 10)
        if (count <= 0) continue

        const created = this.parseGA4DateHour(dateHour)
        if (!created) continue

        const device = mapDevice(deviceRaw)
        const browser = mapBrowser(browserRaw, device)
        const os = mapOS(osRaw)
        const cc = countryId && /^[A-Z]{2}$/.test(countryId) ? countryId : null

        const sessionSeed = [
          dateHour,
          eventName,
          pagePath,
          deviceRaw,
          browserRaw,
          osRaw,
          countryId,
        ].join('|')
        const psid = sessionIdToPsid(sessionSeed)

        const data: Record<string, unknown> = {
          psid,
          profileId: null,
          pid,
          host: truncate(host, 253),
          pg: truncate(pagePath, 2048),
          ev: truncate(eventName, 256),
          dv: device,
          br: truncate(browser, 30),
          brv: null,
          os: truncate(os, 25),
          osv: null,
          lc: null,
          ref: null,
          so: null,
          me: null,
          ca: null,
          te: null,
          co: null,
          cc,
          rg: null,
          rgc: null,
          ct: null,
          'meta.key': [],
          'meta.value': [],
          importID,
          created,
        }

        for (let i = 0; i < count; i++) {
          yield { table: 'customEV', data }
        }
      }

      if (rows.length < PAGE_SIZE) break
      offset += PAGE_SIZE
    }
  }

  // GA4 dateHour format: "2024010115" → "2024-01-01 15:00:00"
  private parseGA4DateHour(raw: string): string | null {
    if (!raw || raw.length < 10) return null
    const year = raw.slice(0, 4)
    const month = raw.slice(4, 6)
    const day = raw.slice(6, 8)
    const hour = raw.slice(8, 10)
    return `${year}-${month}-${day} ${hour}:00:00`
  }
}
