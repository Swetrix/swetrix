// Local response shapes for the v2 errors endpoints
// (GET /v2/projects/:pid/errors, /errors/overview, /errors/:eid, /errors/:eid/sessions).
// The overview and details charts are already columnar ({ x, occurrences,
// affectedUsers }) with labels shifted to the requested timezone, so no
// pivoting is needed before handing them to ErrorChart.

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
  /** Per-dimension breakdowns scoped to the error group, keyed by v1 names (cc, rg, br, ...) */
  params: Record<string, { name: string | null; count: number }[]>
  chart: ErrorsChartData
  timeBucket: string
}

/** Rows of GET /errors/:eid/sessions — entity keys renamed to v2 names */
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
