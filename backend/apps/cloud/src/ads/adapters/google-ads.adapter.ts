import { Injectable, InternalServerErrorException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import _round from 'lodash/round'

import { AppLoggerService } from '../../logger/logger.service'
import { CurrencyService } from '../../revenue/currency.service'
import { AdsService } from '../ads.service'
import {
  AdMetricRow,
  AdsAccount,
  AdsProvider,
  ADS_SYNC_LOOKBACK_DAYS,
  GOOGLE_ADS_API_VERSION,
} from '../interfaces/ads.interface'

dayjs.extend(utc)

const API_BASE = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}`

const FETCH_TIMEOUT_MS = 30_000
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504])
const MAX_FETCH_ATTEMPTS = 3

interface GoogleAdsSearchResult {
  campaign?: {
    id?: string
    name?: string
    status?: string
  }
  customer?: {
    id?: string
    descriptiveName?: string
    currencyCode?: string
  }
  customerClient?: {
    id?: string
    descriptiveName?: string
    manager?: boolean
    currencyCode?: string
    level?: string
  }
  metrics?: {
    costMicros?: string
    clicks?: string
    impressions?: string
    conversions?: number
    conversionsValue?: number
  }
  segments?: {
    date?: string
  }
}

interface GoogleAdsSearchResponse {
  results?: GoogleAdsSearchResult[]
  nextPageToken?: string
}

export interface GoogleAdsSyncTarget {
  id: string
  googleAdsCustomerId: string
  googleAdsLoginCustomerId: string | null
  googleAdsCurrency: string | null
  revenueCurrency: string | null
}

@Injectable()
export class GoogleAdsAdapter {
  constructor(
    private readonly configService: ConfigService,
    private readonly logger: AppLoggerService,
    private readonly adsService: AdsService,
    private readonly currencyService: CurrencyService,
  ) {}

  private getDeveloperToken(): string {
    const token = this.configService.get<string>('GOOGLE_ADS_DEVELOPER_TOKEN')

    if (!token) {
      throw new InternalServerErrorException(
        'Google Ads developer token is not configured',
      )
    }

    return token
  }

  /*
    fetch() with a per-attempt timeout (Google Ads calls run on request paths,
    so they must never hang) and a small backoff retry on transient failures.
    Non-retryable error statuses are returned as-is for the caller to parse.
  */
  private async fetchWithRetry(
    url: string,
    init: RequestInit,
  ): Promise<Response> {
    let lastError: unknown

    for (let attempt = 1; attempt <= MAX_FETCH_ATTEMPTS; attempt++) {
      if (attempt > 1) {
        await new Promise((resolve) => {
          setTimeout(resolve, 500 * 2 ** (attempt - 2))
        })
      }

      try {
        const res = await fetch(url, {
          ...init,
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        })

        if (
          RETRYABLE_STATUS_CODES.has(res.status) &&
          attempt < MAX_FETCH_ATTEMPTS
        ) {
          continue
        }

        return res
      } catch (error) {
        lastError = error
      }
    }

    throw lastError
  }

  private async search(
    accessToken: string,
    customerId: string,
    query: string,
    loginCustomerId?: string | null,
  ): Promise<GoogleAdsSearchResult[]> {
    const results: GoogleAdsSearchResult[] = []
    let pageToken: string | undefined

    do {
      const res = await this.fetchWithRetry(
        `${API_BASE}/customers/${customerId}/googleAds:search`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'developer-token': this.getDeveloperToken(),
            ...(loginCustomerId
              ? { 'login-customer-id': loginCustomerId }
              : {}),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query,
            ...(pageToken ? { pageToken } : {}),
          }),
        },
      )

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`Google Ads API error (${res.status}): ${text}`)
      }

      const data: GoogleAdsSearchResponse = await res.json()
      results.push(...(data.results || []))
      pageToken = data.nextPageToken
    } while (pageToken)

    return results
  }

  /*
    Lists all non-manager ad accounts the OAuth grant can access, walking one
    level down into manager (MCC) accounts. Individual roots that error (e.g.
    cancelled accounts) are skipped.
  */
  async listAccessibleAccounts(accessToken: string): Promise<AdsAccount[]> {
    const res = await this.fetchWithRetry(
      `${API_BASE}/customers:listAccessibleCustomers`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'developer-token': this.getDeveloperToken(),
        },
      },
    )

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Google Ads API error (${res.status}): ${text}`)
    }

    const data: { resourceNames?: string[] } = await res.json()
    const rootIds = (data.resourceNames || [])
      .map((name) => name.split('/')[1])
      .filter(Boolean)

    const accounts = new Map<string, AdsAccount>()

    for (const rootId of rootIds) {
      try {
        const results = await this.search(
          accessToken,
          rootId,
          `SELECT customer_client.id, customer_client.descriptive_name,
             customer_client.manager, customer_client.currency_code,
             customer_client.level
           FROM customer_client
           WHERE customer_client.level <= 1`,
          rootId,
        )

        for (const result of results) {
          const client = result.customerClient
          if (!client?.id || client.manager) {
            continue
          }

          const isRoot = String(client.level) === '0'

          if (!accounts.has(client.id)) {
            accounts.set(client.id, {
              customerId: client.id,
              name: client.descriptiveName || client.id,
              currency: client.currencyCode || null,
              isManager: false,
              loginCustomerId: isRoot ? null : rootId,
            })
          }
        }
      } catch (error) {
        this.logger.warn(
          { error, rootId },
          'Failed to list Google Ads client accounts for an accessible customer',
        )
      }
    }

    return Array.from(accounts.values())
  }

  async getAccountCurrency(
    accessToken: string,
    customerId: string,
    loginCustomerId?: string | null,
  ): Promise<string | null> {
    try {
      const results = await this.search(
        accessToken,
        customerId,
        'SELECT customer.id, customer.currency_code FROM customer',
        loginCustomerId,
      )

      return results[0]?.customer?.currencyCode || null
    } catch (error) {
      this.logger.warn(
        { error, customerId },
        'Failed to fetch Google Ads account currency',
      )
      return null
    }
  }

  /*
    Fetches daily campaign metrics for the lookback window and upserts them
    into the ad_metrics table (idempotent via ReplacingMergeTree(synced_at)).
  */
  async syncCampaignMetrics(
    project: GoogleAdsSyncTarget,
    lookbackDays: number = ADS_SYNC_LOOKBACK_DAYS,
  ): Promise<number> {
    const accessToken = await this.adsService.getAuthedAccessToken(project.id)

    const to = dayjs.utc().format('YYYY-MM-DD')
    const from = dayjs.utc().subtract(lookbackDays, 'day').format('YYYY-MM-DD')

    const results = await this.search(
      accessToken,
      project.googleAdsCustomerId,
      `SELECT campaign.id, campaign.name, campaign.status, segments.date,
         metrics.cost_micros, metrics.clicks, metrics.impressions,
         metrics.conversions, metrics.conversions_value
       FROM campaign
       WHERE segments.date BETWEEN '${from}' AND '${to}'`,
      project.googleAdsLoginCustomerId,
    )

    const targetCurrency = (project.revenueCurrency || 'USD').toUpperCase()

    // When the ads account currency is unknown, assuming USD would silently
    // misconvert non-USD accounts - store the amounts unconverted instead
    const originalCurrency = project.googleAdsCurrency
      ? project.googleAdsCurrency.toUpperCase()
      : targetCurrency

    if (!project.googleAdsCurrency) {
      this.logger.warn(
        { projectId: project.id },
        'Google Ads account currency is unknown; storing campaign metrics without currency conversion',
      )
    }

    // Conversion is linear, so resolve the rate once instead of per row
    const conversionRate = await this.currencyService.convert(
      1,
      originalCurrency,
      targetCurrency,
    )
    const syncedAt = new Date()

    const rows: AdMetricRow[] = []

    for (const result of results) {
      const campaignId = result.campaign?.id
      const date = result.segments?.date

      if (!campaignId || !date) {
        continue
      }

      const originalCost = Number(result.metrics?.costMicros || 0) / 1e6
      const cost = originalCost * conversionRate
      const conversionsValue =
        Number(result.metrics?.conversionsValue || 0) * conversionRate

      rows.push({
        pid: project.id,
        provider: AdsProvider.GOOGLE,
        accountId: project.googleAdsCustomerId,
        campaignId,
        campaignName: result.campaign?.name || campaignId,
        campaignStatus: result.campaign?.status || 'UNKNOWN',
        date,
        impressions: Number(result.metrics?.impressions || 0),
        clicks: Number(result.metrics?.clicks || 0),
        cost: _round(cost, 4),
        originalCost: _round(originalCost, 4),
        originalCurrency,
        currency: targetCurrency,
        conversions: _round(Number(result.metrics?.conversions || 0), 2),
        conversionsValue: _round(conversionsValue, 4),
        syncedAt,
      })
    }

    await this.adsService.insertAdMetrics(rows)

    this.logger.log(
      { projectId: project.id, rows: rows.length },
      'Google Ads sync completed',
    )

    return rows.length
  }
}
