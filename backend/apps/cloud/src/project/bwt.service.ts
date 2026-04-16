import { parse as parseDomain } from 'tldts'
import _isEmpty from 'lodash/isEmpty'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import CryptoJS from 'crypto-js'

import { isDevelopment, PRODUCTION_ORIGIN, redis } from '../common/constants'
import { ProjectService } from './project.service'
import { deriveKey } from '../common/utils'
import { parseBrandKeywords } from './gsc.service'

dayjs.extend(utc)

type StoredTokens = {
  access_token?: string
  refresh_token?: string
  scope?: string
  expiry_date?: number
  site_url?: string | null
}

const REDIS_STATE_PREFIX = 'bwt:state:'

const BWT_REDIRECT_URL = isDevelopment
  ? 'http://localhost:3000/bwt-connected'
  : `${PRODUCTION_ORIGIN}/bwt-connected`

const BWT_AUTHORIZE_URL = 'https://www.bing.com/webmasters/OAuth/authorize'
const BWT_TOKEN_URL = 'https://www.bing.com/webmasters/oauth/token'
const BWT_API_BASE = 'https://ssl.bing.com/webmaster/api.svc/json'

const ENCRYPTION_KEY = deriveKey('bwt-token')

type BwtQueryStatsRow = {
  Query: string
  Clicks: number
  Impressions: number
  AvgClickPosition: number
  AvgImpressionPosition: number
  Date: string
}

type BwtRankTrafficRow = {
  Clicks: number
  Impressions: number
  Date: string
}

function parseBingDate(raw: string): dayjs.Dayjs {
  const match = /\/Date\((\d+)/.exec(raw)
  if (match) {
    return dayjs.utc(Number(match[1]))
  }
  return dayjs.utc(raw)
}

@Injectable()
export class BWTService {
  constructor(
    private readonly configService: ConfigService,
    private readonly projectService: ProjectService,
  ) {}

  private getClientCredentials() {
    const clientId = this.configService.get<string>('BING_BWT_CLIENT_ID')
    const clientSecret = this.configService.get<string>(
      'BING_BWT_CLIENT_SECRET',
    )

    if (!clientId || !clientSecret) {
      throw new InternalServerErrorException(
        'Bing Webmaster Tools client is not configured',
      )
    }

    return { clientId, clientSecret }
  }

  async generateConnectURL(uid: string, pid: string): Promise<{ url: string }> {
    const project = await this.projectService.getRedisProject(pid)
    this.projectService.allowedToManage(project, uid)

    const { clientId } = this.getClientCredentials()

    const state = `${pid}:${uid}:${Date.now()}`
    await redis.set(
      REDIS_STATE_PREFIX + state,
      JSON.stringify({ uid, pid }),
      'EX',
      600,
    )

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: BWT_REDIRECT_URL,
      scope: 'webmaster.read',
      state,
    })

    return { url: `${BWT_AUTHORIZE_URL}?${params.toString()}` }
  }

  async handleOAuthCallback(uid: string, code: string, state: string) {
    const cached = await redis.get(REDIS_STATE_PREFIX + state)
    if (!cached) {
      throw new BadRequestException('Invalid or expired OAuth state')
    }

    const { pid } = JSON.parse(cached)
    const project = await this.projectService.getRedisProject(pid)
    this.projectService.allowedToManage(project, uid)

    const { clientId, clientSecret } = this.getClientCredentials()

    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: BWT_REDIRECT_URL,
    })

    const res = await fetch(BWT_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })

    if (!res.ok) {
      throw new BadRequestException('Failed to exchange Bing OAuth code')
    }

    const tokens = await res.json()

    const existingTokens = await this.getStoredTokens(pid)

    const toStore: StoredTokens = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expires_in
        ? Date.now() + tokens.expires_in * 1000
        : undefined,
      scope: tokens.scope,
      site_url: existingTokens.site_url ?? null,
    }

    await this.setStoredTokens(pid, toStore)

    // Bing doesn't expose user email via a standard endpoint,
    // so we store a placeholder indicating the account is connected.
    await this.projectService.update(
      { id: pid },
      { bwtAccountEmail: 'connected' } as any,
    )

    await redis.del(REDIS_STATE_PREFIX + state)

    return { pid }
  }

  private async getStoredTokens(pid: string): Promise<StoredTokens> {
    const project = await this.projectService.findOne({
      where: { id: pid },
      select: [
        'bwtAccessTokenEnc',
        'bwtRefreshTokenEnc',
        'bwtTokenExpiry',
        'bwtScope',
        'bwtSiteUrl',
      ],
    })

    if (!project) return {}

    const decrypt = (val?: string | null) => {
      if (!val) return undefined
      try {
        const bytes = CryptoJS.Rabbit.decrypt(val, ENCRYPTION_KEY)
        return bytes.toString(CryptoJS.enc.Utf8) || undefined
      } catch {
        return undefined
      }
    }

    const expiry = project.bwtTokenExpiry
      ? Number(project.bwtTokenExpiry)
      : undefined

    return {
      access_token: decrypt(project.bwtAccessTokenEnc),
      refresh_token: decrypt(project.bwtRefreshTokenEnc),
      expiry_date: expiry,
      scope: project.bwtScope || undefined,
      site_url: project.bwtSiteUrl || null,
    }
  }

  private async setStoredTokens(pid: string, tokens: StoredTokens) {
    const encrypt = (val?: string) =>
      val ? CryptoJS.Rabbit.encrypt(val, ENCRYPTION_KEY).toString() : null

    await this.projectService.update(
      { id: pid },
      {
        bwtAccessTokenEnc: encrypt(tokens.access_token),
        bwtRefreshTokenEnc: encrypt(tokens.refresh_token),
        bwtTokenExpiry: tokens.expiry_date as any,
        bwtScope: tokens.scope || null,
        bwtSiteUrl: tokens.site_url ?? null,
      } as any,
    )
  }

  async disconnect(pid: string) {
    await this.projectService.update(
      { id: pid },
      {
        bwtAccessTokenEnc: null,
        bwtRefreshTokenEnc: null,
        bwtTokenExpiry: null,
        bwtScope: null,
        bwtSiteUrl: null,
        bwtAccountEmail: null,
      } as any,
    )
  }

  async isConnected(pid: string) {
    const tokens = await this.getStoredTokens(pid)
    return !_isEmpty(tokens?.refresh_token || tokens?.access_token)
  }

  async getStatus(
    pid: string,
  ): Promise<{ connected: boolean; email: string | null }> {
    const connected = await this.isConnected(pid)
    if (!connected) return { connected, email: null }
    const project = await this.projectService.findOne({
      where: { id: pid },
      select: ['bwtAccountEmail'],
    })
    return { connected, email: project?.bwtAccountEmail || null }
  }

  private async getAccessToken(pid: string): Promise<string> {
    const tokens = await this.getStoredTokens(pid)

    if (_isEmpty(tokens)) {
      throw new BadRequestException(
        'Bing Webmaster Tools is not connected for this project',
      )
    }

    if (tokens.expiry_date && tokens.expiry_date <= Date.now()) {
      if (!tokens.refresh_token) {
        throw new BadRequestException('Bing token expired and no refresh token')
      }

      const { clientId, clientSecret } = this.getClientCredentials()

      const body = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: tokens.refresh_token,
        grant_type: 'refresh_token',
      })

      const res = await fetch(BWT_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      })

      if (!res.ok) {
        throw new BadRequestException('Failed to refresh Bing access token')
      }

      const data = await res.json()

      const updated: StoredTokens = {
        ...tokens,
        access_token: data.access_token,
        expiry_date: data.expires_in
          ? Date.now() + data.expires_in * 1000
          : Date.now() + 55 * 60 * 1000,
        refresh_token: data.refresh_token || tokens.refresh_token,
      }

      await this.setStoredTokens(pid, updated)
      return updated.access_token!
    }

    return tokens.access_token!
  }

  private async callBingApi<T>(
    pid: string,
    method: string,
    params: Record<string, string> = {},
  ): Promise<T> {
    const accessToken = await this.getAccessToken(pid)

    const query = new URLSearchParams(params)
    const url = `${BWT_API_BASE}/${method}?${query.toString()}`

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!res.ok) {
      throw new InternalServerErrorException(
        `Bing API call ${method} failed: ${res.status}`,
      )
    }

    return res.json()
  }

  async listSites(
    pid: string,
  ): Promise<{ siteUrl: string; permissionLevel?: string }[]> {
    try {
      const data = await this.callBingApi<{ d: any[] }>(pid, 'GetUserSites')
      const sites = data?.d || []
      return sites.map((s: any) => ({
        siteUrl: s.Url || s.url || s.SiteUrl || '',
        permissionLevel: undefined,
      }))
    } catch {
      throw new InternalServerErrorException(
        'Failed to fetch Bing Webmaster sites',
      )
    }
  }

  async setProperty(pid: string, siteUrl: string) {
    const tokens = await this.getStoredTokens(pid)
    if (_isEmpty(tokens)) {
      throw new BadRequestException(
        'Bing Webmaster Tools is not connected for this project',
      )
    }
    await this.projectService.update(
      { id: pid },
      { bwtSiteUrl: siteUrl ?? null } as any,
    )
  }

  private filterByDateRange<T extends { Date: string }>(
    rows: T[],
    from: string,
    to: string,
  ): T[] {
    const fromDate = dayjs.utc(from).startOf('day')
    const toDate = dayjs.utc(to).endOf('day')

    return rows.filter((row) => {
      const d = parseBingDate(row.Date)
      return d.isAfter(fromDate.subtract(1, 'millisecond')) && d.isBefore(toDate.add(1, 'millisecond'))
    })
  }

  private getSiteUrl(pid: string): Promise<string> {
    return this.getStoredTokens(pid).then((tokens) => {
      if (_isEmpty(tokens.site_url)) {
        throw new BadRequestException(
          'Bing Webmaster site is not linked for this project',
        )
      }
      return tokens.site_url as string
    })
  }

  async getKeywords(
    pid: string,
    from: string,
    to: string,
    limit = 250,
    offset = 0,
  ): Promise<
    {
      name: string
      count: number
      impressions: number
      position: number
      ctr: number
    }[]
  > {
    const siteUrl = await this.getSiteUrl(pid)

    try {
      const data = await this.callBingApi<{ d: BwtQueryStatsRow[] }>(
        pid,
        'GetQueryStats',
        { siteUrl },
      )

      const filtered = this.filterByDateRange(data?.d || [], from, to)

      const aggregated = new Map<
        string,
        { clicks: number; impressions: number; positionSum: number; count: number }
      >()

      for (const row of filtered) {
        const key = (row.Query || '').toLowerCase()
        const existing = aggregated.get(key)
        if (existing) {
          existing.clicks += row.Clicks || 0
          existing.impressions += row.Impressions || 0
          existing.positionSum +=
            (row.AvgImpressionPosition || 0) * (row.Impressions || 0)
          existing.count++
        } else {
          aggregated.set(key, {
            clicks: row.Clicks || 0,
            impressions: row.Impressions || 0,
            positionSum:
              (row.AvgImpressionPosition || 0) * (row.Impressions || 0),
            count: 1,
          })
        }
      }

      return Array.from(aggregated.entries())
        .map(([name, stats]) => ({
          name: name || '(not set)',
          count: Math.round(stats.clicks),
          impressions: Math.round(stats.impressions),
          position: Number(
            (stats.impressions > 0
              ? stats.positionSum / stats.impressions
              : 0
            ).toFixed(2),
          ),
          ctr: Number(
            (stats.impressions > 0
              ? (stats.clicks / stats.impressions) * 100
              : 0
            ).toFixed(2),
          ),
        }))
        .sort((a, b) => b.count - a.count)
        .slice(offset, offset + limit)
    } catch (err) {
      if (err instanceof BadRequestException) throw err
      throw new InternalServerErrorException(
        'Failed to fetch keywords from Bing Webmaster Tools',
      )
    }
  }

  async getSummary(
    pid: string,
    from: string,
    to: string,
  ): Promise<{
    clicks: number
    impressions: number
    ctr: number
    position: number
  }> {
    const siteUrl = await this.getSiteUrl(pid)

    try {
      const data = await this.callBingApi<{ d: BwtRankTrafficRow[] }>(
        pid,
        'GetRankAndTrafficStats',
        { siteUrl },
      )

      const filtered = this.filterByDateRange(data?.d || [], from, to)

      let totalClicks = 0
      let totalImpressions = 0

      for (const row of filtered) {
        totalClicks += row.Clicks || 0
        totalImpressions += row.Impressions || 0
      }

      // GetRankAndTrafficStats doesn't include position, so we use query stats
      const queryData = await this.callBingApi<{ d: BwtQueryStatsRow[] }>(
        pid,
        'GetQueryStats',
        { siteUrl },
      )

      const filteredQueries = this.filterByDateRange(
        queryData?.d || [],
        from,
        to,
      )

      let positionWeightedSum = 0
      let positionTotalImpressions = 0

      for (const row of filteredQueries) {
        const imp = row.Impressions || 0
        positionWeightedSum += (row.AvgImpressionPosition || 0) * imp
        positionTotalImpressions += imp
      }

      const avgPosition =
        positionTotalImpressions > 0
          ? positionWeightedSum / positionTotalImpressions
          : 0

      return {
        clicks: Math.round(totalClicks),
        impressions: Math.round(totalImpressions),
        ctr: Number(
          (totalImpressions > 0
            ? (totalClicks / totalImpressions) * 100
            : 0
          ).toFixed(2),
        ),
        position: Number(avgPosition.toFixed(1)),
      }
    } catch (err) {
      if (err instanceof BadRequestException) throw err
      throw new InternalServerErrorException(
        'Failed to fetch summary from Bing Webmaster Tools',
      )
    }
  }

  async getDateSeries(
    pid: string,
    from: string,
    to: string,
  ): Promise<
    {
      date: string
      clicks: number
      impressions: number
      ctr: number
      position: number
    }[]
  > {
    const siteUrl = await this.getSiteUrl(pid)

    try {
      const data = await this.callBingApi<{ d: BwtRankTrafficRow[] }>(
        pid,
        'GetRankAndTrafficStats',
        { siteUrl },
      )

      const filtered = this.filterByDateRange(data?.d || [], from, to)

      return filtered.map((row) => {
        const d = parseBingDate(row.Date)
        const imp = row.Impressions || 0
        const clicks = row.Clicks || 0
        return {
          date: d.format('YYYY-MM-DD'),
          clicks: Math.round(clicks),
          impressions: Math.round(imp),
          ctr: Number((imp > 0 ? (clicks / imp) * 100 : 0).toFixed(2)),
          position: 0,
        }
      })
    } catch (err) {
      if (err instanceof BadRequestException) throw err
      throw new InternalServerErrorException(
        'Failed to fetch date series from Bing Webmaster Tools',
      )
    }
  }

  async getTopPages(
    pid: string,
    from: string,
    to: string,
    limit = 50,
    offset = 0,
  ): Promise<
    {
      page: string
      clicks: number
      impressions: number
      ctr: number
      position: number
    }[]
  > {
    const siteUrl = await this.getSiteUrl(pid)

    try {
      const data = await this.callBingApi<{ d: BwtQueryStatsRow[] }>(
        pid,
        'GetPageStats',
        { siteUrl },
      )

      const filtered = this.filterByDateRange(data?.d || [], from, to)

      const aggregated = new Map<
        string,
        { clicks: number; impressions: number; positionSum: number }
      >()

      for (const row of filtered) {
        const key = row.Query || ''
        const existing = aggregated.get(key)
        if (existing) {
          existing.clicks += row.Clicks || 0
          existing.impressions += row.Impressions || 0
          existing.positionSum +=
            (row.AvgImpressionPosition || 0) * (row.Impressions || 0)
        } else {
          aggregated.set(key, {
            clicks: row.Clicks || 0,
            impressions: row.Impressions || 0,
            positionSum:
              (row.AvgImpressionPosition || 0) * (row.Impressions || 0),
          })
        }
      }

      return Array.from(aggregated.entries())
        .map(([page, stats]) => ({
          page: page || '(not set)',
          clicks: Math.round(stats.clicks),
          impressions: Math.round(stats.impressions),
          ctr: Number(
            (stats.impressions > 0
              ? (stats.clicks / stats.impressions) * 100
              : 0
            ).toFixed(2),
          ),
          position: Number(
            (stats.impressions > 0
              ? stats.positionSum / stats.impressions
              : 0
            ).toFixed(1),
          ),
        }))
        .sort((a, b) => b.clicks - a.clicks)
        .slice(offset, offset + limit)
    } catch (err) {
      if (err instanceof BadRequestException) throw err
      throw new InternalServerErrorException(
        'Failed to fetch top pages from Bing Webmaster Tools',
      )
    }
  }

  async getBrandedTraffic(
    pid: string,
    from: string,
    to: string,
  ): Promise<{ branded: number; nonBranded: number }> {
    const brandKeywords = await this.getProjectBrandKeywords(pid)
    if (_isEmpty(brandKeywords)) {
      return { branded: 0, nonBranded: 0 }
    }

    const siteUrl = await this.getSiteUrl(pid)

    try {
      const data = await this.callBingApi<{ d: BwtQueryStatsRow[] }>(
        pid,
        'GetQueryStats',
        { siteUrl },
      )

      const filtered = this.filterByDateRange(data?.d || [], from, to)

      let branded = 0
      let nonBranded = 0

      for (const row of filtered) {
        const query = (row.Query || '').toLowerCase()
        const clicks = row.Clicks || 0

        if (brandKeywords.some((keyword) => query.includes(keyword))) {
          branded += clicks
        } else {
          nonBranded += clicks
        }
      }

      return {
        branded: Math.round(branded),
        nonBranded: Math.round(nonBranded),
      }
    } catch (err) {
      if (err instanceof BadRequestException) throw err
      throw new InternalServerErrorException(
        'Failed to fetch branded traffic from Bing Webmaster Tools',
      )
    }
  }

  private async getProjectBrandKeywords(pid: string): Promise<string[]> {
    const project = await this.projectService.findOne({
      where: { id: pid },
      select: ['name', 'websiteUrl', 'brandKeywords'],
    })

    if (!project) return []

    const parsed = parseBrandKeywords(project.brandKeywords)
    if (parsed && parsed.length > 0) {
      return Array.from(
        new Set(parsed.map((k) => k.toLowerCase().trim()).filter(Boolean)),
      )
    }

    const keywords = new Set<string>()

    if (project.websiteUrl) {
      try {
        const { domainWithoutSuffix } = parseDomain(project.websiteUrl)
        if (domainWithoutSuffix) {
          keywords.add(domainWithoutSuffix.toLowerCase())
        }
      } catch {
        //
      }
    }

    if (project.name) {
      const name = project.name.toLowerCase().trim()
      if (name.length >= 3) {
        keywords.add(name)
      }
    }

    return Array.from(keywords)
  }

  async getDashboard(
    pid: string,
    from: string,
    to: string,
    timeBucket?: string,
    filtersStr?: string,
  ) {
    const connected = await this.isConnected(pid)
    if (!connected) {
      return { notConnected: true }
    }

    const tokens = await this.getStoredTokens(pid)
    if (_isEmpty(tokens.site_url)) {
      return { notConnected: true, noProperty: true }
    }

    const fromDate = dayjs(from)
    const toDate = dayjs(to)
    const days = toDate.diff(fromDate, 'day') + 1
    const prevTo = fromDate.subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss')
    const prevFrom = fromDate
      .subtract(days, 'day')
      .format('YYYY-MM-DD HH:mm:ss')

    try {
      const [
        summary,
        previousSummary,
        dateSeries,
        topPages,
        topQueries,
        brandedTraffic,
      ] = await Promise.all([
        this.getSummary(pid, from, to),
        this.getSummary(pid, prevFrom, prevTo).catch(() => null),
        this.getDateSeries(pid, from, to),
        this.getTopPages(pid, from, to, 50, 0),
        this.getKeywords(pid, from, to, 50, 0),
        this.getBrandedTraffic(pid, from, to),
      ])

      return {
        notConnected: false,
        summary,
        previousSummary,
        dateSeries,
        topPages,
        topQueries,
        topCountries: [],
        topDevices: [],
        brandedTraffic,
      }
    } catch {
      return { notConnected: true }
    }
  }
}
