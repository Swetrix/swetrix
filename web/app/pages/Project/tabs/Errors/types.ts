interface ErrorsChartData {
  x: string[]
  occurrences: number[]
  affectedUsers: number[]
}

export interface ErrorsOverviewData {
  stats: {
    totalErrors: number
    uniqueErrors: number
    affectedSessions: number
    affectedUsers: number
    errorRate: number
  }
  mostFrequentError: {
    eid: string
    name: string
    message: string | null
    count: number
    usersAffected: number
    lastSeen: string
  } | null
  chart: ErrorsChartData
  timeBucket: string
}

export interface ErrorDetailsInfo {
  eid: string
  name: string
  message: string | null
  filename: string | null
  colno: number | null
  lineno: number | null
  stackTrace: string | null
  count: number
  status: 'active' | 'regressed' | 'resolved' | null
  first_seen: string
  last_seen: string
  users?: number
}

interface ErrorMetadataRow {
  key: string
  value: string
  count: number
}

export interface ErrorDetailsData {
  details: ErrorDetailsInfo
  metadata: ErrorMetadataRow[]
  params: Record<string, { name: string | null; count: number }[]>
  chart: ErrorsChartData
  timeBucket: string
}

export interface ErrorSessionItem {
  psid: string
  profileId: string | null
  country: string | null
  browser: string | null
  os: string | null
  firstErrorAt: string
  lastErrorAt: string
  errorCount: number
}
