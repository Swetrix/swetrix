export interface IUsageInfoRedis {
  total: number
  traffic: number
  customEvents: number
  outboundLinks?: number
  captcha: number
  errors: number
}

export interface IUsageInfoBreakdown extends IUsageInfoRedis {
  trafficPerc: number
  customEventsPerc: number
  outboundLinksPerc: number
  captchaPerc: number
  errorsPerc: number
}

export interface IUsageInfo extends IUsageInfoBreakdown {
  projects: number
  sessionReplays: number
  last30Days: IUsageInfoBreakdown
}
