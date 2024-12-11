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

export interface Overall {
  [key: string]: OverallObject
}

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

export interface LiveStats {
  [key: string]: number
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
}

export interface CaptchaProject extends Project {
  isCaptchaProject: true
  isCaptchaEnabled: true
}
