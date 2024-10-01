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

interface IUserShareProject {
  email: string
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
  user: IUserShareProject
}

export interface IProjectNames {
  name: string
  id: string
  isCaptchaProject: boolean
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
  isOwner: boolean
  overall: IOverallObject
  uiHidden: boolean
  funnels: IFunnel[]
  isPublic?: boolean
  isTransferring?: boolean
  isPasswordProtected?: boolean
  password?: string
  isLocked: boolean
  isDataExists: boolean
  isErrorDataExists: boolean
}

export interface ICaptchaProject {
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
  isOwner: boolean
  overall: IOverallObject
  uiHidden: boolean
}
