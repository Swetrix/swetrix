import { randomBytes } from 'crypto'
import _isEmpty from 'lodash/isEmpty'
import _round from 'lodash/round'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { OAuth2Client } from 'google-auth-library'
import CryptoJS from 'crypto-js'

import { isDevelopment, PRODUCTION_ORIGIN, redis } from '../common/constants'
import { deriveKey } from '../common/utils'
import { clickhouse } from '../common/integrations/clickhouse'
import { ProjectService } from '../project/project.service'
import {
  AdMetricRow,
  AdsProvider,
  GOOGLE_PAID_UTM_SOURCES,
  PAID_UTM_MEDIUMS,
  normalizeCampaignKey,
} from './interfaces/ads.interface'

dayjs.extend(utc)

export interface AdsCampaignRow {
  campaignId: string
  campaignName: string
  campaignStatus: string
  cost: number
  clicks: number
  impressions: number
  ctr: number
  cpc: number
  conversions: number
  conversionsValue: number
  sessions: number
  revenue: number
  purchases: number
  roas: number | null
  cpa: number | null
}

export interface AdsStats {
  cost: number
  clicks: number
  impressions: number
  conversions: number
  ctr: number
  cpc: number
  sessions: number
  revenue: number
  purchases: number
  roas: number | null
  cpa: number | null
  previous: {
    cost: number
    clicks: number
    sessions: number
    revenue: number
  }
}

export interface AdsChart {
  x: string[]
  cost: number[]
  clicks: number[]
  sessions: number[]
}

// Latest-state-per-(campaign, day) view over the ReplacingMergeTree table
const AD_METRICS_DEDUP_SUBQUERY = `
  SELECT
    campaign_id,
    date,
    argMax(campaign_name, synced_at) AS campaign_name,
    argMax(campaign_status, synced_at) AS campaign_status,
    argMax(cost, synced_at) AS cost,
    argMax(clicks, synced_at) AS clicks,
    argMax(impressions, synced_at) AS impressions,
    argMax(conversions, synced_at) AS conversions,
    argMax(conversions_value, synced_at) AS conversions_value
  FROM ad_metrics
  WHERE
    pid = {pid:FixedString(12)}
    AND provider = {provider:String}
    AND date BETWEEN toDate({groupFrom:String}) AND toDate({groupTo:String})
  GROUP BY campaign_id, date
`

const PAID_TRAFFIC_GUARD = `(so IN {paidSources:Array(String)} OR me IN {paidMediums:Array(String)})`

type StoredTokens = {
  access_token?: string
  refresh_token?: string
  scope?: string
  expiry_date?: number
}

const REDIS_STATE_PREFIX = 'ads:state:'

const ADS_REDIRECT_URL = isDevelopment
  ? 'http://localhost:3000/ads-connected'
  : `${PRODUCTION_ORIGIN}/ads-connected`

const ENCRYPTION_KEY = deriveKey('google-ads-token')

@Injectable()
export class AdsService {
  constructor(
    private readonly configService: ConfigService,
    private readonly projectService: ProjectService,
  ) {}

  isConfigured(): boolean {
    return Boolean(
      this.configService.get<string>('GOOGLE_ADS_CLIENT_ID') &&
      this.configService.get<string>('GOOGLE_ADS_CLIENT_SECRET') &&
      this.configService.get<string>('GOOGLE_ADS_DEVELOPER_TOKEN'),
    )
  }

  private getOAuthClient() {
    const clientId = this.configService.get<string>('GOOGLE_ADS_CLIENT_ID')
    const clientSecret = this.configService.get<string>(
      'GOOGLE_ADS_CLIENT_SECRET',
    )

    if (!clientId || !clientSecret) {
      throw new InternalServerErrorException(
        'Google Ads Client is not configured',
      )
    }

    return new OAuth2Client(clientId, clientSecret, ADS_REDIRECT_URL)
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
        'https://www.googleapis.com/auth/adwords',
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
        // The email is nice-to-have; never let a slow Google response hang
        // the OAuth callback
        signal: AbortSignal.timeout(15_000),
      })
      const data = await res.json()
      accountEmail = data?.email || null
    } catch {
      //
    }

    const previous = await this.getStoredTokens(pid)

    const toStore: StoredTokens = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || previous.refresh_token,
      expiry_date: tokens.expiry_date,
      scope: tokens.scope,
    }

    await this.setStoredTokens(pid, toStore)

    await this.projectService.update({ id: pid }, {
      googleAdsAccountEmail: accountEmail,
      googleAdsSyncError: null,
    } as any)

    await redis.del(REDIS_STATE_PREFIX + state)

    return { pid }
  }

  private async getStoredTokens(pid: string): Promise<StoredTokens> {
    const project = await this.projectService.findOne({
      where: { id: pid },
      select: [
        'googleAdsAccessTokenEnc',
        'googleAdsRefreshTokenEnc',
        'googleAdsTokenExpiry',
        'googleAdsScope',
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

    const expiry = project.googleAdsTokenExpiry
      ? Number(project.googleAdsTokenExpiry)
      : undefined

    return {
      access_token: decrypt(project.googleAdsAccessTokenEnc),
      refresh_token: decrypt(project.googleAdsRefreshTokenEnc),
      expiry_date: expiry,
      scope: project.googleAdsScope || undefined,
    }
  }

  private async setStoredTokens(pid: string, tokens: StoredTokens) {
    const encrypt = (val?: string) =>
      val ? CryptoJS.Rabbit.encrypt(val, ENCRYPTION_KEY).toString() : null

    await this.projectService.update({ id: pid }, {
      googleAdsAccessTokenEnc: encrypt(tokens.access_token),
      googleAdsRefreshTokenEnc: encrypt(tokens.refresh_token),
      googleAdsTokenExpiry: tokens.expiry_date as any,
      googleAdsScope: tokens.scope || null,
    } as any)
  }

  async disconnect(pid: string) {
    await this.projectService.update({ id: pid }, {
      googleAdsCustomerId: null,
      googleAdsLoginCustomerId: null,
      googleAdsAccessTokenEnc: null,
      googleAdsRefreshTokenEnc: null,
      googleAdsTokenExpiry: null,
      googleAdsScope: null,
      googleAdsAccountEmail: null,
      googleAdsCurrency: null,
      googleAdsLastSyncAt: null,
      googleAdsSyncError: null,
    } as any)
  }

  async isConnected(pid: string) {
    const tokens = await this.getStoredTokens(pid)
    return !_isEmpty(tokens?.refresh_token || tokens?.access_token)
  }

  async getStatus(pid: string): Promise<{
    connected: boolean
    available: boolean
    email: string | null
    customerId: string | null
    currency: string | null
    lastSyncAt: string | null
    syncError: string | null
  }> {
    const available = this.isConfigured()
    const connected = available && (await this.isConnected(pid))

    if (!connected) {
      return {
        connected,
        available,
        email: null,
        customerId: null,
        currency: null,
        lastSyncAt: null,
        syncError: null,
      }
    }

    const project = await this.projectService.findOne({
      where: { id: pid },
      select: [
        'googleAdsAccountEmail',
        'googleAdsCustomerId',
        'googleAdsCurrency',
        'googleAdsLastSyncAt',
        'googleAdsSyncError',
      ],
    })

    return {
      connected,
      available,
      email: project?.googleAdsAccountEmail || null,
      customerId: project?.googleAdsCustomerId || null,
      currency: project?.googleAdsCurrency || null,
      lastSyncAt: project?.googleAdsLastSyncAt?.toISOString() || null,
      syncError: project?.googleAdsSyncError || null,
    }
  }

  /*
    Returns a valid access token for the project, refreshing (and persisting)
    it when expired. Throws with the underlying OAuth error message on refresh
    failure so callers can detect revoked grants ('invalid_grant').
  */
  async getAuthedAccessToken(pid: string): Promise<string> {
    const tokens = await this.getStoredTokens(pid)
    if (_isEmpty(tokens) || !(tokens.refresh_token || tokens.access_token)) {
      throw new BadRequestException(
        'Google Ads is not connected for this project',
      )
    }

    const oauth2Client = this.getOAuthClient()
    oauth2Client.setCredentials(tokens)

    const needsRefresh =
      !tokens.access_token ||
      (tokens.expiry_date && tokens.expiry_date <= Date.now())

    if (needsRefresh) {
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
        return newAccess
      }
    }

    return tokens.access_token as string
  }

  async setAccount(
    pid: string,
    customerId: string,
    loginCustomerId: string | null,
    currency: string | null,
  ) {
    await this.projectService.update({ id: pid }, {
      googleAdsCustomerId: customerId,
      googleAdsLoginCustomerId: loginCustomerId,
      googleAdsCurrency: currency,
      googleAdsLastSyncAt: null,
      googleAdsSyncError: null,
    } as any)
  }

  async updateLastSyncAt(pid: string) {
    await this.projectService.update({ id: pid }, {
      googleAdsLastSyncAt: new Date(),
    } as any)
  }

  async markSyncError(pid: string, error: string) {
    await this.projectService.update({ id: pid }, {
      googleAdsSyncError: error.slice(0, 512),
    } as any)
  }

  async clearSyncError(pid: string) {
    await this.projectService.update({ id: pid }, {
      googleAdsSyncError: null,
    } as any)
  }

  async insertAdMetrics(rows: AdMetricRow[]): Promise<void> {
    if (_isEmpty(rows)) {
      return
    }

    const formatDateForCH = (date: Date): string => {
      return date
        .toISOString()
        .replace('T', ' ')
        .replace(/\.\d{3}Z$/, '')
    }

    await clickhouse.insert({
      table: 'ad_metrics',
      values: rows.map((row) => ({
        pid: row.pid,
        provider: row.provider,
        account_id: row.accountId,
        campaign_id: row.campaignId,
        campaign_name: row.campaignName,
        campaign_status: row.campaignStatus,
        date: row.date,
        impressions: row.impressions,
        clicks: row.clicks,
        cost: row.cost,
        original_cost: row.originalCost,
        original_currency: row.originalCurrency,
        currency: row.currency,
        conversions: row.conversions,
        conversions_value: row.conversionsValue,
        synced_at: formatDateForCH(row.syncedAt),
      })),
      format: 'JSONEachRow',
    })
  }

  private async getAdAggregates(
    pid: string,
    groupFrom: string,
    groupTo: string,
  ): Promise<
    {
      campaign_id: string
      campaign_name: string
      campaign_status: string
      cost: number
      clicks: number
      impressions: number
      conversions: number
      conversions_value: number
    }[]
  > {
    const query = `
      SELECT
        campaign_id,
        argMax(campaign_name, date) AS campaign_name,
        argMax(campaign_status, date) AS campaign_status,
        sum(cost) AS cost,
        sum(clicks) AS clicks,
        sum(impressions) AS impressions,
        sum(conversions) AS conversions,
        sum(conversions_value) AS conversions_value
      FROM (${AD_METRICS_DEDUP_SUBQUERY})
      GROUP BY campaign_id
      ORDER BY cost DESC
    `

    const { data } = await clickhouse
      .query({
        query,
        query_params: {
          pid,
          provider: AdsProvider.GOOGLE,
          groupFrom,
          groupTo,
        },
      })
      .then((resultSet) => resultSet.json<any>())

    return data
  }

  private async getSessionsPerCampaignValue(
    pid: string,
    groupFrom: string,
    groupTo: string,
  ): Promise<{ ca: string; sessions: number }[]> {
    const query = `
      SELECT
        ca,
        uniqExact(psid) AS sessions
      FROM events
      WHERE
        pid = {pid:FixedString(12)}
        AND type = 'pageview'
        AND psid IS NOT NULL
        AND ca IS NOT NULL
        AND ${PAID_TRAFFIC_GUARD}
        AND created BETWEEN {groupFrom:String} AND {groupTo:String}
      GROUP BY ca
    `

    const { data } = await clickhouse
      .query({
        query,
        query_params: {
          pid,
          groupFrom,
          groupTo,
          paidSources: GOOGLE_PAID_UTM_SOURCES,
          paidMediums: PAID_UTM_MEDIUMS,
        },
      })
      .then((resultSet) => resultSet.json<{ ca: string; sessions: number }>())

    return data
  }

  private async getRevenuePerCampaignValue(
    pid: string,
    groupFrom: string,
    groupTo: string,
  ): Promise<{ ca: string; revenue: number; purchases: number }[]> {
    // First-touch campaign of the purchasing session; revenue rows are
    // linked to sessions via the swetrix_session_id metadata (session_id)
    const query = `
      SELECT
        s.ca AS ca,
        sum(r.amount) AS revenue,
        count() AS purchases
      FROM (
        SELECT
          toString(psid) AS psid_str,
          argMin(ca, created) AS ca
        FROM events
        WHERE
          pid = {pid:FixedString(12)}
          AND type = 'pageview'
          AND psid IS NOT NULL
          AND ca IS NOT NULL
          AND ${PAID_TRAFFIC_GUARD}
          AND created BETWEEN {groupFrom:String} AND {groupTo:String}
        GROUP BY psid
      ) AS s
      INNER JOIN (
        SELECT
          argMax(toString(session_id), synced_at) AS session_id,
          argMax(amount, synced_at) AS amount,
          argMax(type, synced_at) AS type
        FROM revenue
        WHERE
          pid = {pid:FixedString(12)}
          AND session_id IS NOT NULL
          AND created BETWEEN {groupFrom:String} AND {groupTo:String}
        GROUP BY pid, transaction_id
      ) AS r ON r.session_id = s.psid_str
      WHERE r.type IN ('sale', 'subscription')
      GROUP BY s.ca
    `

    const { data } = await clickhouse
      .query({
        query,
        query_params: {
          pid,
          groupFrom,
          groupTo,
          paidSources: GOOGLE_PAID_UTM_SOURCES,
          paidMediums: PAID_UTM_MEDIUMS,
        },
      })
      .then((resultSet) =>
        resultSet.json<{ ca: string; revenue: number; purchases: number }>(),
      )

    return data
  }

  /*
    Campaign rows with Swetrix-side metrics merged in. Campaigns are matched
    to utm_campaign values by campaign id or (lowercased) campaign name -
    users are instructed to use a final URL suffix with {campaignid}.
  */
  async getCampaignRows(
    pid: string,
    groupFrom: string,
    groupTo: string,
  ): Promise<AdsCampaignRow[]> {
    const [adAggregates, sessionRows, revenueRows] = await Promise.all([
      this.getAdAggregates(pid, groupFrom, groupTo),
      this.getSessionsPerCampaignValue(pid, groupFrom, groupTo),
      this.getRevenuePerCampaignValue(pid, groupFrom, groupTo),
    ])

    const rows: AdsCampaignRow[] = adAggregates.map((agg) => ({
      campaignId: agg.campaign_id,
      campaignName: agg.campaign_name,
      campaignStatus: agg.campaign_status,
      cost: _round(Number(agg.cost), 2),
      clicks: Number(agg.clicks),
      impressions: Number(agg.impressions),
      ctr:
        Number(agg.impressions) > 0
          ? _round((Number(agg.clicks) / Number(agg.impressions)) * 100, 2)
          : 0,
      cpc:
        Number(agg.clicks) > 0
          ? _round(Number(agg.cost) / Number(agg.clicks), 2)
          : 0,
      conversions: _round(Number(agg.conversions), 2),
      conversionsValue: _round(Number(agg.conversions_value), 2),
      sessions: 0,
      revenue: 0,
      purchases: 0,
      roas: null,
      cpa: null,
    }))

    const byKey = new Map<string, AdsCampaignRow>()
    for (const row of rows) {
      const idKey = row.campaignId.toLowerCase()
      const nameKey = row.campaignName.toLowerCase().trim()
      if (!byKey.has(idKey)) byKey.set(idKey, row)
      if (nameKey && !byKey.has(nameKey)) byKey.set(nameKey, row)
    }

    for (const sessionRow of sessionRows) {
      const match = byKey.get(normalizeCampaignKey(sessionRow.ca))
      if (match) {
        match.sessions += Number(sessionRow.sessions)
      }
    }

    for (const revenueRow of revenueRows) {
      const match = byKey.get(normalizeCampaignKey(revenueRow.ca))
      if (match) {
        match.revenue = _round(match.revenue + Number(revenueRow.revenue), 2)
        match.purchases += Number(revenueRow.purchases)
      }
    }

    for (const row of rows) {
      row.roas = row.cost > 0 ? _round(row.revenue / row.cost, 2) : null
      row.cpa = row.purchases > 0 ? _round(row.cost / row.purchases, 2) : null
    }

    return rows
  }

  async getAdsStats(
    pid: string,
    groupFrom: string,
    groupTo: string,
  ): Promise<AdsStats> {
    const periodDays = dayjs.utc(groupTo).diff(dayjs.utc(groupFrom), 'day') || 1

    // End the previous window just before the current one starts - ad_metrics
    // is daily-grain, so sharing the boundary would count that whole day twice
    const previousTo = dayjs
      .utc(groupFrom)
      .subtract(1, 'second')
      .format('YYYY-MM-DD HH:mm:ss')
    const previousFrom = dayjs
      .utc(previousTo)
      .subtract(periodDays, 'day')
      .format('YYYY-MM-DD HH:mm:ss')

    const [current, previous] = await Promise.all([
      this.getCampaignRows(pid, groupFrom, groupTo),
      this.getCampaignRows(pid, previousFrom, previousTo),
    ])

    const totals = (campaignRows: AdsCampaignRow[]) =>
      campaignRows.reduce(
        (acc, row) => ({
          cost: acc.cost + row.cost,
          clicks: acc.clicks + row.clicks,
          impressions: acc.impressions + row.impressions,
          conversions: acc.conversions + row.conversions,
          sessions: acc.sessions + row.sessions,
          revenue: acc.revenue + row.revenue,
          purchases: acc.purchases + row.purchases,
        }),
        {
          cost: 0,
          clicks: 0,
          impressions: 0,
          conversions: 0,
          sessions: 0,
          revenue: 0,
          purchases: 0,
        },
      )

    const cur = totals(current)
    const prev = totals(previous)

    return {
      cost: _round(cur.cost, 2),
      clicks: cur.clicks,
      impressions: cur.impressions,
      conversions: _round(cur.conversions, 2),
      ctr:
        cur.impressions > 0
          ? _round((cur.clicks / cur.impressions) * 100, 2)
          : 0,
      cpc: cur.clicks > 0 ? _round(cur.cost / cur.clicks, 2) : 0,
      sessions: cur.sessions,
      revenue: _round(cur.revenue, 2),
      purchases: cur.purchases,
      roas: cur.cost > 0 ? _round(cur.revenue / cur.cost, 2) : null,
      cpa: cur.purchases > 0 ? _round(cur.cost / cur.purchases, 2) : null,
      previous: {
        cost: _round(prev.cost, 2),
        clicks: prev.clicks,
        sessions: prev.sessions,
        revenue: _round(prev.revenue, 2),
      },
    }
  }

  async getAdsChart(
    pid: string,
    groupFrom: string,
    groupTo: string,
    timeBucket: string,
    timezone: string,
    xAxis: string[],
  ): Promise<AdsChart> {
    // ad_metrics is daily-grain (account-local days), so buckets are derived
    // from the date column directly - no timezone shifting is possible
    const bucketExpr =
      timeBucket === 'year'
        ? 'toStartOfYear(date)'
        : timeBucket === 'month'
          ? 'toStartOfMonth(date)'
          : 'date'

    const bucketFormat =
      timeBucket === 'year' ? 4 : timeBucket === 'month' ? 7 : 10

    const adQuery = `
      SELECT
        toString(${bucketExpr}) AS bucket,
        sum(cost) AS cost,
        sum(clicks) AS clicks
      FROM (${AD_METRICS_DEDUP_SUBQUERY})
      GROUP BY bucket
      ORDER BY bucket
    `

    const timeBucketFunc =
      timeBucket === 'year'
        ? 'toStartOfYear'
        : timeBucket === 'month'
          ? 'toStartOfMonth'
          : 'toStartOfDay'

    const sessionsQuery = `
      SELECT
        toString(${timeBucketFunc}(toTimeZone(created, {timezone:String}))) AS bucket,
        uniqExact(psid) AS sessions
      FROM events
      WHERE
        pid = {pid:FixedString(12)}
        AND type = 'pageview'
        AND psid IS NOT NULL
        AND ca IS NOT NULL
        AND ${PAID_TRAFFIC_GUARD}
        AND created BETWEEN {groupFrom:String} AND {groupTo:String}
      GROUP BY bucket
      ORDER BY bucket
    `

    const [{ data: adData }, { data: sessionsData }] = await Promise.all([
      clickhouse
        .query({
          query: adQuery,
          query_params: {
            pid,
            provider: AdsProvider.GOOGLE,
            groupFrom,
            groupTo,
          },
        })
        .then((resultSet) =>
          resultSet.json<{ bucket: string; cost: number; clicks: number }>(),
        ),
      clickhouse
        .query({
          query: sessionsQuery,
          query_params: {
            pid,
            groupFrom,
            groupTo,
            timezone,
            paidSources: GOOGLE_PAID_UTM_SOURCES,
            paidMediums: PAID_UTM_MEDIUMS,
          },
        })
        .then((resultSet) =>
          resultSet.json<{ bucket: string; sessions: number }>(),
        ),
    ])

    const cost = Array(xAxis.length).fill(0)
    const clicks = Array(xAxis.length).fill(0)
    const sessions = Array(xAxis.length).fill(0)

    for (const row of adData) {
      const index = xAxis.indexOf(row.bucket.slice(0, bucketFormat))
      if (index !== -1) {
        cost[index] = _round(Number(row.cost), 2)
        clicks[index] = Number(row.clicks)
      }
    }

    for (const row of sessionsData) {
      const index = xAxis.indexOf(row.bucket.slice(0, bucketFormat))
      if (index !== -1) {
        sessions[index] = Number(row.sessions)
      }
    }

    return {
      x: xAxis,
      cost,
      clicks,
      sessions,
    }
  }

  /*
    Lightweight map of normalized utm_campaign keys -> campaign ad metrics,
    used to enrich Traffic tab campaign rows with spend/CPC chips
  */
  async getCampaignMap(
    pid: string,
    groupFrom: string,
    groupTo: string,
  ): Promise<
    Record<
      string,
      {
        campaignId: string
        name: string
        cost: number
        clicks: number
        cpc: number
      }
    >
  > {
    const adAggregates = await this.getAdAggregates(pid, groupFrom, groupTo)

    const map: Record<
      string,
      {
        campaignId: string
        name: string
        cost: number
        clicks: number
        cpc: number
      }
    > = {}

    for (const agg of adAggregates) {
      const entry = {
        campaignId: agg.campaign_id,
        name: agg.campaign_name,
        cost: _round(Number(agg.cost), 2),
        clicks: Number(agg.clicks),
        cpc:
          Number(agg.clicks) > 0
            ? _round(Number(agg.cost) / Number(agg.clicks), 2)
            : 0,
      }

      const idKey = agg.campaign_id.toLowerCase()
      const nameKey = agg.campaign_name.toLowerCase().trim()

      if (!map[idKey]) map[idKey] = entry
      if (nameKey && !map[nameKey]) map[nameKey] = entry
    }

    return map
  }
}
