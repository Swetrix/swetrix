import { randomBytes } from 'crypto'
import { parse as parseDomain } from 'tldts'
import countries from 'i18n-iso-countries'
import _isEmpty from 'lodash/isEmpty'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { OAuth2Client } from 'google-auth-library'
import { searchconsole } from '@googleapis/searchconsole'

import CryptoJS from 'crypto-js'

import { redis } from '../common/constants'
import { ProjectService, deleteProjectRedis } from './project.service'
import {
  deriveKey,
  getProjectClickhouse,
  updateProjectClickhouse,
} from '../common/utils'

dayjs.extend(utc)

type StoredTokens = {
  access_token?: string
  refresh_token?: string
  scope?: string
  expiry_date?: number
  property_uri?: string | null
}

const REDIS_STATE_PREFIX = 'gsc:state:'

const ENCRYPTION_KEY = deriveKey('gsc-token')

const MAX_ROW_LIMIT = 25000
const MAX_BRANDED_PAGES = 10
const MAX_FILTER_EXPRESSION_LENGTH = 500
const MAX_FILTERS = 20

type GSCRow = {
  keys: string[]
  clicks?: number
  impressions?: number
  ctr?: number
  position?: number
}

type GSCContext = {
  sc: ReturnType<typeof searchconsole>
  siteUrl: string
}

interface QueryGSCOptions {
  dimensions?: string[]
  rowLimit?: number
  startRow?: number
  dataState?: string
  dimensionFilterGroups?: any[]
}

function parseBrandKeywords(
  raw: string | string[] | null | undefined,
): string[] | null {
  if (!raw) return null
  if (Array.isArray(raw)) {
    return raw.every((item) => typeof item === 'string') ? raw : null
  }
  try {
    const parsed = JSON.parse(raw)
    if (
      Array.isArray(parsed) &&
      parsed.every((item) => typeof item === 'string')
    ) {
      return parsed
    }
    return null
  } catch {
    return null
  }
}

const getBaseUrl = (): string | null => {
  const raw = process.env.BASE_URL?.trim()
  if (!raw) return null
  return raw.replace(/\/+$/, '')
}

@Injectable()
export class GSCService {
  constructor(
    private readonly configService: ConfigService,
    private readonly projectService: ProjectService,
  ) {}

  isAvailable(): boolean {
    const clientId = this.configService.get<string>('GOOGLE_GSC_CLIENT_ID')
    const clientSecret = this.configService.get<string>(
      'GOOGLE_GSC_CLIENT_SECRET',
    )
    return Boolean(clientId && clientSecret && getBaseUrl())
  }

  private getRedirectUrl(): string {
    const base = getBaseUrl()
    if (!base) {
      throw new InternalServerErrorException(
        'BASE_URL is not configured. Set BASE_URL on the API container to enable Google Search Console integration.',
      )
    }
    return `${base}/gsc-connected`
  }

  private getOAuthClient() {
    const clientId = this.configService.get<string>('GOOGLE_GSC_CLIENT_ID')
    const clientSecret = this.configService.get<string>(
      'GOOGLE_GSC_CLIENT_SECRET',
    )

    if (!clientId || !clientSecret) {
      throw new InternalServerErrorException(
        'Google GSC client is not configured. Set GOOGLE_GSC_CLIENT_ID and GOOGLE_GSC_CLIENT_SECRET on the API container.',
      )
    }

    return new OAuth2Client(clientId, clientSecret, this.getRedirectUrl())
  }

  async generateConnectURL(uid: string, pid: string): Promise<{ url: string }> {
    const project = await this.projectService.getRedisProject(pid)
    this.projectService.allowedToManage(project, uid)

    const oauth2Client = this.getOAuthClient()

    const state = randomBytes(32).toString('hex')
    await redis.set(
      REDIS_STATE_PREFIX + state,
      JSON.stringify({ uid, pid }),
      'EX',
      600,
    )

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/webmasters.readonly',
        'https://www.googleapis.com/auth/userinfo.email',
      ],
      prompt: 'consent',
      state,
    })

    return { url }
  }

  async handleOAuthCallback(uid: string, code: string, state: string) {
    if (!state) {
      throw new BadRequestException('Invalid or expired OAuth state')
    }

    const cached = await redis.get(REDIS_STATE_PREFIX + state)
    if (!cached) {
      throw new BadRequestException('Invalid or expired OAuth state')
    }

    let payload: { uid?: string; pid?: string }
    try {
      payload = JSON.parse(cached)
    } catch {
      throw new BadRequestException('Invalid or expired OAuth state')
    }

    if (!payload?.pid || !payload?.uid || payload.uid !== uid) {
      throw new BadRequestException('Invalid or expired OAuth state')
    }

    const { pid } = payload

    const project = await this.projectService.getRedisProject(pid)

    this.projectService.allowedToManage(project, uid)

    const oauth2Client = this.getOAuthClient()
    const { tokens } = await oauth2Client.getToken(code)
    oauth2Client.setCredentials(tokens)

    let accountEmail: string | null = null
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      })
      const data = await res.json()
      accountEmail = data?.email || null
    } catch {
      //
    }

    const previous = await this.getStoredTokens(pid)

    const toStore: StoredTokens = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
      scope: tokens.scope,
      property_uri: previous.property_uri ?? null,
    }

    await this.setStoredTokens(pid, toStore)

    await updateProjectClickhouse(
      { id: pid, gscAccountEmail: accountEmail },
      { ignoreAllowedKeys: true },
    )

    await deleteProjectRedis(pid)

    await redis.del(REDIS_STATE_PREFIX + state)

    return { pid }
  }

  private async getStoredTokens(pid: string): Promise<StoredTokens> {
    let project: any
    try {
      project = await getProjectClickhouse(pid)
    } catch {
      return {}
    }

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

    const expiry =
      project.gscTokenExpiry !== undefined && project.gscTokenExpiry !== null
        ? Number(project.gscTokenExpiry)
        : undefined

    return {
      access_token: decrypt(project.gscAccessTokenEnc),
      refresh_token: decrypt(project.gscRefreshTokenEnc),
      expiry_date: expiry,
      scope: project.gscScope || undefined,
      property_uri: project.gscPropertyUri || null,
    }
  }

  private async setStoredTokens(pid: string, tokens: StoredTokens) {
    const encrypt = (val?: string) =>
      val ? CryptoJS.Rabbit.encrypt(val, ENCRYPTION_KEY).toString() : null

    await updateProjectClickhouse(
      {
        id: pid,
        gscAccessTokenEnc: encrypt(tokens.access_token),
        gscRefreshTokenEnc: encrypt(tokens.refresh_token),
        gscTokenExpiry:
          tokens.expiry_date !== undefined && tokens.expiry_date !== null
            ? Number(tokens.expiry_date)
            : null,
        gscScope: tokens.scope || null,
        gscPropertyUri: tokens.property_uri ?? null,
      },
      { ignoreAllowedKeys: true },
    )

    await deleteProjectRedis(pid)
  }

  async disconnect(pid: string) {
    await updateProjectClickhouse(
      {
        id: pid,
        gscAccessTokenEnc: null,
        gscRefreshTokenEnc: null,
        gscTokenExpiry: null,
        gscScope: null,
        gscPropertyUri: null,
        gscAccountEmail: null,
      },
      { ignoreAllowedKeys: true },
    )

    await deleteProjectRedis(pid)
  }

  async isConnected(pid: string) {
    const tokens = await this.getStoredTokens(pid)
    return !_isEmpty(tokens?.refresh_token || tokens?.access_token)
  }

  async getStatus(pid: string): Promise<{
    connected: boolean
    email: string | null
    available: boolean
  }> {
    const available = this.isAvailable()
    const connected = available ? await this.isConnected(pid) : false

    if (!connected) {
      return { connected, email: null, available }
    }

    let project: any
    try {
      project = await getProjectClickhouse(pid)
    } catch {
      return { connected, email: null, available }
    }

    return {
      connected,
      email: project?.gscAccountEmail || null,
      available,
    }
  }

  private async getAuthedClientForPid(pid: string) {
    const tokens = await this.getStoredTokens(pid)
    if (_isEmpty(tokens)) {
      throw new BadRequestException(
        'Search Console is not connected for this project',
      )
    }
    const oauth2Client = this.getOAuthClient()
    oauth2Client.setCredentials(tokens)

    if (tokens.expiry_date && tokens.expiry_date <= Date.now()) {
      const refreshed = await oauth2Client.getAccessToken()
      const newAccess =
        typeof refreshed === 'string' ? refreshed : refreshed?.token
      if (newAccess) {
        const updated: StoredTokens = {
          ...tokens,
          access_token: newAccess,
          expiry_date: Date.now() + 55 * 60 * 1000,
        }
        await this.setStoredTokens(pid, updated)
        oauth2Client.setCredentials({ ...updated })
      }
    }

    return oauth2Client
  }

  private async getGSCContext(pid: string): Promise<GSCContext> {
    const tokens = await this.getStoredTokens(pid)
    if (_isEmpty(tokens) || _isEmpty(tokens.property_uri)) {
      throw new BadRequestException(
        'Search Console property is not linked for this project',
      )
    }

    const oauth2Client = this.getOAuthClient()
    oauth2Client.setCredentials(tokens)

    if (tokens.expiry_date && tokens.expiry_date <= Date.now()) {
      const refreshed = await oauth2Client.getAccessToken()
      const newAccess =
        typeof refreshed === 'string' ? refreshed : refreshed?.token
      if (newAccess) {
        const updated: StoredTokens = {
          ...tokens,
          access_token: newAccess,
          expiry_date: Date.now() + 55 * 60 * 1000,
        }
        await this.setStoredTokens(pid, updated)
        oauth2Client.setCredentials({ ...updated })
      }
    }

    return {
      sc: searchconsole({ version: 'v1', auth: oauth2Client }),
      siteUrl: tokens.property_uri as string,
    }
  }

  async listSites(
    pid: string,
  ): Promise<{ siteUrl: string; permissionLevel?: string }[]> {
    const auth = await this.getAuthedClientForPid(pid)
    const sc = searchconsole({ version: 'v1', auth })
    try {
      const { data } = await sc.sites.list({})
      // @ts-ignore
      const sites = (data?.siteEntry || data?.siteEntries || []) as any[]
      return sites.map((s: any) => ({
        siteUrl: s.siteUrl,
        permissionLevel: s.permissionLevel,
      }))
    } catch {
      throw new InternalServerErrorException(
        'Failed to fetch Search Console sites',
      )
    }
  }

  async setProperty(pid: string, propertyUri: string) {
    if (typeof propertyUri !== 'string' || propertyUri.trim().length === 0) {
      throw new BadRequestException('propertyUri is required')
    }

    const tokens = await this.getStoredTokens(pid)
    if (_isEmpty(tokens)) {
      throw new BadRequestException(
        'Search Console is not connected for this project',
      )
    }

    const sites = await this.listSites(pid)
    const isOwned = sites.some((site) => site.siteUrl === propertyUri)

    if (!isOwned) {
      throw new BadRequestException(
        'The provided propertyUri is not available for the connected account',
      )
    }

    await updateProjectClickhouse(
      { id: pid, gscPropertyUri: propertyUri },
      { ignoreAllowedKeys: true },
    )
    await deleteProjectRedis(pid)
  }

  private parseFilters(filtersStr?: string) {
    if (!filtersStr) return undefined

    let filters: unknown
    try {
      filters = JSON.parse(filtersStr)
    } catch {
      throw new BadRequestException('Invalid filters parameter')
    }

    if (!Array.isArray(filters) || filters.length > MAX_FILTERS) {
      throw new BadRequestException('Invalid filters parameter')
    }

    const mappedFilters: Array<{
      dimension: string
      expression: string
      operator?: string
    }> = []

    for (const filter of filters) {
      if (typeof filter !== 'object' || filter === null) {
        throw new BadRequestException('Invalid filters parameter')
      }

      const {
        column,
        filter: value,
        isExclusive,
        isContains,
      } = filter as {
        column?: unknown
        filter?: unknown
        isExclusive?: unknown
        isContains?: unknown
      }

      if (typeof column !== 'string' || typeof value !== 'string') {
        throw new BadRequestException('Invalid filters parameter')
      }
      if (value.length > MAX_FILTER_EXPRESSION_LENGTH) continue

      let dimension: string | undefined
      let expression = value

      if (column === 'pg') {
        dimension = 'page'
      } else if (column === 'keywords') {
        dimension = 'query'
      } else if (column === 'country' || column === 'cc') {
        dimension = 'country'
        if (expression.length === 2) {
          const alpha3 = countries.alpha2ToAlpha3(expression.toUpperCase())
          if (!alpha3) continue
          expression = alpha3.toLowerCase()
        } else {
          expression = expression.toLowerCase()
        }
      } else if (column === 'device' || column === 'dv') {
        dimension = 'device'
        expression = expression.toLowerCase()
      } else {
        continue
      }

      let operator = 'equals'
      if (isExclusive) {
        operator = isContains ? 'notContains' : 'notEquals'
      } else if (isContains) {
        operator = 'contains'
      }

      const filterObj: {
        dimension: string
        expression: string
        operator?: string
      } = {
        dimension,
        expression,
      }
      if (operator !== 'equals') {
        filterObj.operator = operator
      }

      mappedFilters.push(filterObj)
    }

    if (mappedFilters.length > 0) {
      return [{ groupType: 'and', filters: mappedFilters }]
    }

    return undefined
  }

  private getDimensionFilterGroups(
    filtersStr?: string,
    extraFilters: Array<{ dimension: string; expression: string }> = [],
  ) {
    const baseGroups = this.parseFilters(filtersStr) || []

    if (_isEmpty(extraFilters)) {
      return baseGroups
    }

    if (_isEmpty(baseGroups)) {
      return [{ groupType: 'and', filters: extraFilters }]
    }

    return baseGroups.map((group, index) =>
      index === 0
        ? {
            ...group,
            filters: [...(group.filters || []), ...extraFilters],
          }
        : group,
    )
  }

  private async getProjectBrandKeywords(pid: string): Promise<string[]> {
    let project: any
    try {
      project = await getProjectClickhouse(pid)
    } catch {
      return []
    }

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
      const name = String(project.name).toLowerCase().trim()
      if (name.length >= 3) {
        keywords.add(name)
      }
    }

    return Array.from(keywords)
  }

  private async queryGSC(
    ctx: GSCContext,
    from: string,
    to: string,
    options: QueryGSCOptions = {},
  ): Promise<GSCRow[]> {
    const startDate = dayjs(from).format('YYYY-MM-DD')
    const endDate = dayjs(to).format('YYYY-MM-DD')

    const { data } = await ctx.sc.searchanalytics.query({
      siteUrl: ctx.siteUrl,
      requestBody: {
        startDate,
        endDate,
        ...(options.dimensions ? { dimensions: options.dimensions } : {}),
        ...(options.rowLimit != null ? { rowLimit: options.rowLimit } : {}),
        ...(options.startRow != null ? { startRow: options.startRow } : {}),
        dataState: options.dataState || 'all',
        ...(options.dimensionFilterGroups &&
        options.dimensionFilterGroups.length > 0
          ? { dimensionFilterGroups: options.dimensionFilterGroups }
          : {}),
      },
    })

    return (data.rows || []) as GSCRow[]
  }

  private static clampLimit(limit: number, fallback = 50): number {
    return Math.max(1, Math.min(limit || fallback, MAX_ROW_LIMIT))
  }

  private static clampOffset(offset: number): number {
    return Math.max(0, offset || 0)
  }

  async getKeywords(
    pid: string,
    from: string,
    to: string,
    limit = 250,
    offset = 0,
    filtersStr?: string,
    page?: string,
    ctx?: GSCContext,
  ): Promise<
    {
      name: string
      count: number
      impressions: number
      position: number
      ctr: number
    }[]
  > {
    const gsc = ctx || (await this.getGSCContext(pid))
    const dimensionFilterGroups = this.getDimensionFilterGroups(
      filtersStr,
      page ? [{ dimension: 'page', expression: page }] : [],
    )

    try {
      const rows = await this.queryGSC(gsc, from, to, {
        dimensions: ['query'],
        rowLimit: GSCService.clampLimit(limit, 250),
        startRow: GSCService.clampOffset(offset),
        dimensionFilterGroups,
      })

      return rows
        .map((row) => ({
          name: row.keys?.[0] || '(not set)',
          count: Math.round(row.clicks || 0),
          impressions: Math.round(row.impressions || 0),
          position: Number(Number(row.position || 0).toFixed(2)),
          ctr: Number(Number((row.ctr || 0) * 100).toFixed(2)),
        }))
        .filter(Boolean)
    } catch {
      throw new InternalServerErrorException(
        'Failed to fetch keywords from Search Console',
      )
    }
  }

  async getSummary(
    pid: string,
    from: string,
    to: string,
    filtersStr?: string,
    ctx?: GSCContext,
  ): Promise<{
    clicks: number
    impressions: number
    ctr: number
    position: number
  }> {
    const gsc = ctx || (await this.getGSCContext(pid))
    const dimensionFilterGroups = this.getDimensionFilterGroups(filtersStr)

    try {
      const rows = await this.queryGSC(gsc, from, to, {
        dimensionFilterGroups,
      })

      const row = rows[0]
      return {
        clicks: Math.round(row?.clicks || 0),
        impressions: Math.round(row?.impressions || 0),
        ctr: Number(Number((row?.ctr || 0) * 100).toFixed(2)),
        position: Number(Number(row?.position || 0).toFixed(1)),
      }
    } catch {
      throw new InternalServerErrorException(
        'Failed to fetch summary from Search Console',
      )
    }
  }

  async getDateSeries(
    pid: string,
    from: string,
    to: string,
    timeBucket?: string,
    filtersStr?: string,
    ctx?: GSCContext,
  ): Promise<
    {
      date: string
      clicks: number
      impressions: number
      ctr: number
      position: number
    }[]
  > {
    const gsc = ctx || (await this.getGSCContext(pid))
    const dimensionFilterGroups = this.getDimensionFilterGroups(filtersStr)
    const isHourly = timeBucket === 'hour'

    try {
      const rows = await this.queryGSC(gsc, from, to, {
        dimensions: isHourly ? ['HOUR'] : ['date'],
        rowLimit: 5000,
        dataState: isHourly ? 'HOURLY_ALL' : 'all',
        dimensionFilterGroups,
      })

      return rows.map((row) => ({
        date: row.keys?.[0]
          ? isHourly
            ? dayjs.utc(row.keys[0]).format('YYYY-MM-DD HH:mm:ss')
            : row.keys[0]
          : '',
        clicks: Math.round(row.clicks || 0),
        impressions: Math.round(row.impressions || 0),
        ctr: Number(Number((row.ctr || 0) * 100).toFixed(2)),
        position: Number(Number(row.position || 0).toFixed(1)),
      }))
    } catch {
      throw new InternalServerErrorException(
        'Failed to fetch date series from Search Console',
      )
    }
  }

  async getTopPages(
    pid: string,
    from: string,
    to: string,
    limit = 50,
    offset = 0,
    filtersStr?: string,
    query?: string,
    ctx?: GSCContext,
  ): Promise<
    {
      page: string
      clicks: number
      impressions: number
      ctr: number
      position: number
    }[]
  > {
    const gsc = ctx || (await this.getGSCContext(pid))
    const dimensionFilterGroups = this.getDimensionFilterGroups(
      filtersStr,
      query ? [{ dimension: 'query', expression: query }] : [],
    )

    try {
      const rows = await this.queryGSC(gsc, from, to, {
        dimensions: ['page'],
        rowLimit: GSCService.clampLimit(limit),
        startRow: GSCService.clampOffset(offset),
        dimensionFilterGroups,
      })

      return rows.map((row) => ({
        page: row.keys?.[0] || '(not set)',
        clicks: Math.round(row.clicks || 0),
        impressions: Math.round(row.impressions || 0),
        ctr: Number(Number((row.ctr || 0) * 100).toFixed(2)),
        position: Number(Number(row.position || 0).toFixed(1)),
      }))
    } catch {
      throw new InternalServerErrorException(
        'Failed to fetch top pages from Search Console',
      )
    }
  }

  async getTopCountries(
    pid: string,
    from: string,
    to: string,
    limit = 50,
    offset = 0,
    filtersStr?: string,
    ctx?: GSCContext,
  ): Promise<
    {
      country: string
      clicks: number
      impressions: number
      ctr: number
      position: number
    }[]
  > {
    const gsc = ctx || (await this.getGSCContext(pid))
    const dimensionFilterGroups = this.getDimensionFilterGroups(filtersStr)

    try {
      const rows = await this.queryGSC(gsc, from, to, {
        dimensions: ['country'],
        rowLimit: GSCService.clampLimit(limit),
        startRow: GSCService.clampOffset(offset),
        dimensionFilterGroups,
      })

      return rows.map((row) => ({
        country: (row.keys?.[0] || '').toLowerCase(),
        clicks: Math.round(row.clicks || 0),
        impressions: Math.round(row.impressions || 0),
        ctr: Number(Number((row.ctr || 0) * 100).toFixed(2)),
        position: Number(Number(row.position || 0).toFixed(1)),
      }))
    } catch {
      throw new InternalServerErrorException(
        'Failed to fetch top countries from Search Console',
      )
    }
  }

  async getTopDevices(
    pid: string,
    from: string,
    to: string,
    limit = 50,
    offset = 0,
    filtersStr?: string,
    ctx?: GSCContext,
  ): Promise<
    {
      device: string
      clicks: number
      impressions: number
      ctr: number
      position: number
    }[]
  > {
    const gsc = ctx || (await this.getGSCContext(pid))
    const dimensionFilterGroups = this.getDimensionFilterGroups(filtersStr)

    try {
      const rows = await this.queryGSC(gsc, from, to, {
        dimensions: ['device'],
        rowLimit: GSCService.clampLimit(limit),
        startRow: GSCService.clampOffset(offset),
        dimensionFilterGroups,
      })

      return rows.map((row) => ({
        device: (row.keys?.[0] || '').toLowerCase(),
        clicks: Math.round(row.clicks || 0),
        impressions: Math.round(row.impressions || 0),
        ctr: Number(Number((row.ctr || 0) * 100).toFixed(2)),
        position: Number(Number(row.position || 0).toFixed(1)),
      }))
    } catch {
      throw new InternalServerErrorException(
        'Failed to fetch top devices from Search Console',
      )
    }
  }

  async getBrandedTraffic(
    pid: string,
    from: string,
    to: string,
    filtersStr?: string,
    ctx?: GSCContext,
  ): Promise<{ branded: number; nonBranded: number }> {
    const brandKeywords = await this.getProjectBrandKeywords(pid)
    if (_isEmpty(brandKeywords)) {
      return { branded: 0, nonBranded: 0 }
    }

    const gsc = ctx || (await this.getGSCContext(pid))
    const dimensionFilterGroups = this.getDimensionFilterGroups(filtersStr)
    const rowLimit = MAX_ROW_LIMIT
    let startRow = 0
    let branded = 0
    let nonBranded = 0
    let pages = 0

    try {
      while (pages < MAX_BRANDED_PAGES) {
        const rows = await this.queryGSC(gsc, from, to, {
          dimensions: ['query'],
          rowLimit,
          startRow,
          dimensionFilterGroups,
        })

        for (const row of rows) {
          const query = (row.keys?.[0] || '').toLowerCase()
          const clicks = row.clicks || 0

          if (brandKeywords.some((keyword) => query.includes(keyword))) {
            branded += clicks
          } else {
            nonBranded += clicks
          }
        }

        if (rows.length < rowLimit) break

        startRow += rowLimit
        pages++
      }

      return {
        branded: Math.round(branded),
        nonBranded: Math.round(nonBranded),
      }
    } catch {
      throw new InternalServerErrorException(
        'Failed to fetch branded traffic from Search Console',
      )
    }
  }

  async getDashboard(
    pid: string,
    from: string,
    to: string,
    timeBucket?: string,
    filtersStr?: string,
  ) {
    if (!this.isAvailable()) {
      return { notConnected: true }
    }

    const connected = await this.isConnected(pid)
    if (!connected) {
      return { notConnected: true }
    }

    const tokens = await this.getStoredTokens(pid)
    if (_isEmpty(tokens.property_uri)) {
      return { notConnected: true, noProperty: true }
    }

    let ctx: GSCContext
    try {
      ctx = await this.getGSCContext(pid)
    } catch {
      return { notConnected: true }
    }

    const fromDate = dayjs(from)
    const toDate = dayjs(to)
    const durationMs = toDate.diff(fromDate)
    const prevTo = fromDate
      .subtract(1, 'millisecond')
      .format('YYYY-MM-DD HH:mm:ss')
    const prevFrom = fromDate
      .subtract(durationMs, 'millisecond')
      .format('YYYY-MM-DD HH:mm:ss')

    const [
      summary,
      previousSummary,
      dateSeries,
      topPages,
      topQueries,
      topCountries,
      topDevices,
      brandedTraffic,
    ] = await Promise.all([
      this.getSummary(pid, from, to, filtersStr, ctx),
      this.getSummary(pid, prevFrom, prevTo, filtersStr, ctx).catch(() => null),
      this.getDateSeries(pid, from, to, timeBucket, filtersStr, ctx),
      this.getTopPages(pid, from, to, 50, 0, filtersStr, undefined, ctx),
      this.getKeywords(pid, from, to, 50, 0, filtersStr, undefined, ctx),
      this.getTopCountries(pid, from, to, 50, 0, filtersStr, ctx),
      this.getTopDevices(pid, from, to, 50, 0, filtersStr, ctx),
      this.getBrandedTraffic(pid, from, to, filtersStr, ctx),
    ])

    return {
      notConnected: false,
      summary,
      previousSummary,
      dateSeries,
      topPages,
      topQueries,
      topCountries,
      topDevices,
      brandedTraffic,
    }
  }
}
