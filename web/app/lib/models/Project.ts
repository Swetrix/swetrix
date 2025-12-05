import { Organisation, Role } from './Organisation'

interface OverallPeriodStats {
  all: number
  unique?: number
  bounceRate?: number
  sdur?: number
}

export interface OverallObject {
  current: OverallPeriodStats
  previous: OverallPeriodStats
  change: number
  uniqueChange?: number
  bounceRateChange?: number
  sdurChange?: number
  customEVFilterApplied?: boolean
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

export type LiveStats = Record<string, number>

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

export interface SwetrixError {
  eid: string
  name: string
  message: string
  filename: string
  count: number
  last_seen: string
  status: 'active' | 'regressed' | 'fixed' | 'resolved'
}

export interface SwetrixErrorDetails extends SwetrixError {
  colno: number
  lineno: number
  first_seen: string
  stackTrace?: string
}

export interface Session {
  psid: string
  cc: string | null
  os: string | null
  br: string | null
  pageviews: number
  customEvents: number
  errors: number
  created: string
  isLive: 1 | 0
  sdur?: number

  sessionStart: string
  lastActivity: string
}

export interface SessionDetails {
  cc: string | null
  os: string | null
  osv: string | null
  br: string | null
  brv: string | null
  lc: string | null
  ref: string | null
  so: string | null
  me: string | null
  ca: string | null
  te: string | null
  co: string | null
  rg: string | null
  ct: string | null
  dv: string | null

  sdur?: number
  isLive?: boolean
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
  cc: string | null
  os: string | null
  br: string | null
  dv: string | null
}

export interface ProfileDetails extends Profile {
  avgDuration: number
  rg: string | null
  ct: string | null
  lc: string | null
  osv: string | null
  brv: string | null
  topPages: { page: string; count: number }[]
  activityCalendar: { date: string; count: number }[]
  chart?: {
    x: string[]
    pageviews: number[]
    customEvents: number[]
    errors: number[]
  }
  timeBucket?: string
}

export interface AnalyticsFunnel {
  value: string
  events: number
  eventsPerc: number
  eventsPercStep: number
  dropoff: number
  dropoffPercStep: number
}

export interface Project {
  id: string
  name: string
  origins: string[] | string | null
  ipBlacklist: string[] | null | string
  countryBlacklist: string[] | null
  active: boolean
  public: boolean
  isAnalyticsProject: boolean
  isCaptchaProject: boolean
  isCaptchaEnabled: boolean
  captchaSecretKey: string | null
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
  botsProtectionLevel: 'off' | 'basic'
  role?: Role
  gscPropertyUri?: string | null
}

export interface CaptchaProject extends Project {
  isCaptchaProject: true
  isCaptchaEnabled: true
}

export interface Extension {
  id: string
  name: string
  description: string
  version: string
  status: string
  price: number
  mainImage: string
  additionalImages: string[]
  fileURL: string
  companyLink: string | null
  createdAt: string
  updatedAt: string
  tags: string[]
  owner: {
    nickname: string
  }
  category: {
    id: number
    name: string
  }
  usersQuantity: number
}
