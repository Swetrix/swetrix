import { Organisation, Role } from './Organisation'

interface _IOverallPeriodStats {
  all: number
  unique?: number
  bounceRate?: number
  sdur?: number
}

export interface IOverallObject {
  current: _IOverallPeriodStats
  previous: _IOverallPeriodStats
  change: number
  uniqueChange?: number
  bounceRateChange?: number
  sdurChange?: number
  customEVFilterApplied?: boolean
}

export interface IOverall {
  [key: string]: IOverallObject
}

export interface IOverallPerformanceObject {
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

export interface ILiveStats {
  [key: string]: number
}

export interface IShareOwnerProject {
  id: string
  confirmed: boolean
  role: string
  created: string
  updated: string
  user: UserShareProject
}

export interface IFunnel {
  id: string
  name: string
  steps: string[]
  created: string
}

export interface IAnalyticsFunnel {
  value: string
  events: number
  eventsPerc: number
  eventsPercStep: number
  dropoff: number
  dropoffPercStep: number
}

export interface IProject {
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
  share?: IShareOwnerProject[]
  overall: IOverallObject
  uiHidden: boolean
  funnels: IFunnel[]
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

export interface ICaptchaProject extends IProject {
  isCaptchaProject: true
  isCaptchaEnabled: true
}
