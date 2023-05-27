export interface IUsageInfoRedis {
  total: number
  traffic: number
  customEvents: number
  captcha: number
}

export interface IUsageInfo extends IUsageInfoRedis {
  trafficPerc: number
  customEventsPerc: number
  captchaPerc: number
}
