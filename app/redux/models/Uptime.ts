export interface Monitor {
  id: string
  type: string
  name: string
  url: string
  interval: number
  retries: number
  retryInterval: number
  timeout: number
  acceptedStatusCodes: number[]
  description: string | null
  projectId: string
  createdAt: Date
  updatedAt: Date
  httpOptions: {
    method: string[]
    body?: Record<string, unknown>
    headers?: Record<string, string>
  }
}

/*
current: {
            avg: currentPeriod.avg,
            min: currentPeriod.min,
            max: currentPeriod.max,
          },
          previous: {
            avg: previousPeriod.avg || 0,
            min: previousPeriod.min,
            max: previousPeriod.max,
          },
          avgChange: currentPeriod.avg - previousPeriod.avg,
          minChange: currentPeriod.min - previousPeriod.min,
          maxChange: currentPeriod.max - previousPeriod.max,
          */

interface MonitorOverallPeriodStats {
  avg: number
  min: number
  max: number
}

export interface MonitorOverallObject {
  current: MonitorOverallPeriodStats
  previous: MonitorOverallPeriodStats
  avgChange: number
  minChange: number
  maxChange: number
}

export interface MonitorOverall {
  [key: string]: MonitorOverallObject
}
