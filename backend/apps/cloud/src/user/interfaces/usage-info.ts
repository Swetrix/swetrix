export interface IUsageInfoRedis {
  total: number
  traffic: number
  customEvents: number
  captcha: number
  errors: number
}

export interface IUsageInfoBreakdown extends IUsageInfoRedis {
  trafficPerc: number
  customEventsPerc: number
  captchaPerc: number
  errorsPerc: number
}

export interface IUsageInfo extends IUsageInfoBreakdown {
  projects: number
  last30Days: IUsageInfoBreakdown
}
