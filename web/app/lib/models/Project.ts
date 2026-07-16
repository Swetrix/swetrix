import { Organisation, Role } from './Organisation'
import type { ProjectFeatureAccess } from '~/lib/pricing/features'

interface OverallPeriodStats {
  all: number
  unique?: number
  users?: number
  bounceRate?: number
  sdur?: number
}

export interface OverallChart {
  x: string[]
  visits: number[]
  bounces?: number[]
}

export interface OverallObject {
  current: OverallPeriodStats
  previous: OverallPeriodStats
  change: number
  uniqueChange?: number
  usersChange?: number
  bounceRateChange?: number
  sdurChange?: number
  customEVFilterApplied?: boolean
  chart?: OverallChart
}

export type Overall = Record<string, OverallObject>

export interface OverallPerformanceObject {
  current: {
    frontend: number
    backend: number
    network: number
  }
  previous: {
    frontend: number
    backend: number
    network: number
  }
  frontendChange: number
  backendChange: number
  networkChange: number
}

interface UserShareProject {
  email: string
  id: string
}

export interface ShareOwnerProject {
  id: string
  confirmed: boolean
  role: string
  created: string
  updated: string
  user: UserShareProject
}

export interface Funnel {
  id: string
  name: string
  steps: string[]
  created: string
}

export interface Annotation {
  id: string
  date: string
  text: string
  created: string
}

type SessionReplayPrivacy = 'total' | 'normal' | 'none'

export interface SessionReplayMetadata {
  hasReplay: boolean
  replayId: string
  privacyMode: SessionReplayPrivacy
  chunkCount: number
  eventCount: number
  replayDuration: number
  replayExpiresAt: string
}

export interface Session {
  psid: string
  country: string | null
  os: string | null
  browser: string | null
  pageviews: number
  customEvents: number
  errors: number
  revenue?: number
  refunds?: number
  isLive: 1 | 0
  duration?: number | null

  sessionStart: string
  lastActivity: string

  profileId: string | null
  isIdentified: 1 | 0
  isFirstSession: 1 | 0
  hasReplay?: 1 | 0
  replayDuration?: number | null
  replayExpiresAt?: string | null
}

export interface SessionDetails {
  country: string | null
  os: string | null
  os_version: string | null
  browser: string | null
  browser_version: string | null
  locale: string | null
  referrer: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_term: string | null
  utm_content: string | null
  region: string | null
  city: string | null
  device: string | null
  profileId: string | null

  duration?: number
  isLive?: boolean
  revenue?: number
  refunds?: number
}

export interface Profile {
  profileId: string
  isIdentified: boolean
  sessionsCount: number
  pageviewsCount: number
  eventsCount: number
  errorsCount: number
  firstSeen: string
  lastSeen: string
  country: string | null
  os: string | null
  browser: string | null
  device: string | null
}

export interface ProfileDetails extends Profile {
  avgDuration: number
  region: string | null
  city: string | null
  locale: string | null
  os_version: string | null
  browser_version: string | null
  topPages: { page: string; count: number }[]
  activityCalendar: { date: string; pageviews: number; events: number }[]
  totalRevenue?: number
  revenueCurrency?: string
}

export interface AnalyticsFunnel {
  value: string
  events: number
  eventsPerc: number
  eventsPercStep: number
  dropoff: number
  dropoffPerc: number
  dropoffPercStep: number
  topCountries: Record<string, number>
  topSources: Record<string, number>
  breakdowns?: {
    countries?: Record<string, number>
    devices?: Record<string, number>
    browsers?: Record<string, number>
    sources?: Record<string, number>
    campaigns?: Record<string, number>
    pages?: Record<string, number>
    profileTypes?: Record<string, number>
  }
}

export type Provider =
  | 'umami'
  | 'simple-analytics'
  | 'fathom'
  | 'google-analytics'
  | 'plausible'

export const IMPORT_PROVIDERS: Provider[] = [
  'fathom',
  'google-analytics',
  'plausible',
  'simple-analytics',
  'umami',
].filter((x): x is Provider => !!x)

export type ProxyDomainStatus = 'waiting' | 'issuing' | 'live' | 'error'

export interface ProxyDomain {
  id: string
  hostname: string
  proxyTargetId: string
  proxyTarget: string
  status: ProxyDomainStatus
  errorMessage: string | null
  lastCheckedAt: string | null
  liveSince: string | null
  statusChangedAt: string | null
  created: string
}

export interface DataImport {
  id: number
  importId: number
  projectId: string
  provider: Provider
  status: 'pending' | 'processing' | 'completed' | 'failed'
  dateFrom: string | null
  dateTo: string | null
  totalRows: number
  importedRows: number
  invalidRows: number
  errorMessage: string | null
  createdAt: string
  finishedAt: string | null
}

export interface Project {
  id: string
  name: string
  origins: string[] | string | null
  ipBlacklist: string[] | null | string
  ipWhitelist: string[] | null | string
  countryBlacklist: string[] | null
  active: boolean
  public: boolean
  captchaSecretKey: string | null
  captchaDifficulty: number
  captchaDifficultyMode?: 'manual' | 'auto'
  created: string
  share?: ShareOwnerProject[]
  overall: OverallObject
  uiHidden: boolean
  funnels: Funnel[]
  isPublic?: boolean
  isTransferring?: boolean
  isPasswordProtected?: boolean
  isAccessConfirmed?: boolean
  organisationId?: string
  organisation?: Organisation
  password?: string
  isLocked: boolean
  isDataExists: boolean
  isErrorDataExists: boolean
  isCaptchaDataExists: boolean
  isReplayDataExists: boolean
  featureAccess?: ProjectFeatureAccess
  sessionReplayRetentionDays?: number
  botsProtectionLevel: 'off' | 'basic' | 'strict'
  role?: Role
  gscPropertyUri?: string | null
  isPinned?: boolean
  revenueCurrency?: string
  websiteUrl?: string | null
  brandKeywords?: string[] | null
}
