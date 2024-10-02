export type Region = 'asia' | 'europe' | 'us' | 'auto'

export interface MonitorRecord {
  region: Region
  responseTime: number
  timestamp: number
  statusCode: number
}

export interface RegionMetrics {
  currentResponseTime: number | null
  avgResponseTime24H: number
  uptime24H: number
  uptime30Days: number
}

export interface MonitorData {
  [region: string]: RegionMetrics
}
