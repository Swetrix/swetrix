export enum AdsProvider {
  GOOGLE = 'google',
}

// Pinned Google Ads API version. Versions sunset roughly a year after
// release (v23 released 2026-01, supported until ~2027-01) - bump regularly.
export const GOOGLE_ADS_API_VERSION = 'v23'

export const ADS_SYNC_ERROR_TOKEN_REVOKED = 'token_revoked'

// How many days back the incremental sync re-fetches: Google restates
// conversion metrics for up to ~30 days after the click
export const ADS_SYNC_LOOKBACK_DAYS = 35

// How many days of history the initial sync fetches after account selection
export const ADS_BACKFILL_DAYS = 90

// Heuristic guard for which events count as paid Google traffic when
// attributing Swetrix sessions/revenue to campaigns
export const GOOGLE_PAID_UTM_SOURCES = ['google', 'googleads', 'google_ads']
export const PAID_UTM_MEDIUMS = ['cpc', 'ppc', 'paid']

/*
  Normalizes a utm_campaign value for matching against ad campaign ids/names:
  URL-decoded, lowercased, trimmed
*/
export const normalizeCampaignKey = (value: string): string => {
  try {
    return decodeURIComponent(value).toLowerCase().trim()
  } catch {
    return value.toLowerCase().trim()
  }
}

export interface AdsAccount {
  customerId: string
  name: string
  currency: string | null
  isManager: boolean
  // Manager (MCC) account id that grants access to this account, sent as the
  // login-customer-id header; null when the account is accessed directly
  loginCustomerId: string | null
}

export interface AdMetricRow {
  pid: string
  provider: AdsProvider
  accountId: string
  campaignId: string
  campaignName: string
  campaignStatus: string
  date: string // YYYY-MM-DD, in the ads account's timezone
  impressions: number
  clicks: number
  cost: number
  originalCost: number
  originalCurrency: string
  currency: string
  conversions: number
  conversionsValue: number
  syncedAt: Date
}
