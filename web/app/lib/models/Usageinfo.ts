interface UsageInfoBreakdown {
  total: number
  traffic: number
  customEvents: number
  captcha: number
  errors: number
  trafficPerc: number
  customEventsPerc: number
  captchaPerc: number
  errorsPerc: number
}

export interface UsageInfo extends UsageInfoBreakdown {
  projects: number
  last30Days: UsageInfoBreakdown
}
