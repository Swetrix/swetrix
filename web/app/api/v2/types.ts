export type V2DataType = 'traffic' | 'performance' | 'errors' | 'captcha'

export type V2FilterOperator = 'is' | 'is_not' | 'contains' | 'contains_not'

export interface V2Filter {
  dimension: string
  operator: V2FilterOperator
  value: string | null | (string | null)[]
  /** Required for event_metadata / page_property filters */
  key?: string
}

interface V2Meta {
  pid: string
  period?: string | null
  from?: string
  to?: string
  timezone?: string
  appliedFilters?: V2Filter[]
  /** Breakdown / list endpoints */
  total?: number
  limit?: number
  offset?: number
  sort?: string
  dimension?: string
  metrics?: string[]
  /** Timeseries endpoints */
  timeBucket?: string
  allowedTimeBuckets?: string[] | null
  mode?: string
  /** Live visitors */
  windowMinutes?: number
  [key: string]: unknown
}

export interface V2Envelope<T> {
  data: T
  meta: V2Meta
}

export type V2CommonParams = {
  period?: string
  from?: string
  to?: string
  timezone?: string
  filters?: V2Filter[]
}

/** { value: 'US', country?: ..., visitors: 119, pageviews: 267, ... } */
export interface BreakdownRow {
  value: string | null
  [metricOrExtraField: string]: unknown
}

/** { timestamp: '2026-07-01T00:00:00Z', visitors: 120, ... } */
export interface TimeseriesRow {
  timestamp: string
  [metric: string]: number | string
}

interface TrafficSummaryStats {
  visitors: number
  pageviews: number
  users: number
  bounce_rate: number
  session_duration: number
}

export interface TrafficSummaryData {
  current: TrafficSummaryStats
  previous: TrafficSummaryStats
  change: TrafficSummaryStats
}

interface PerformanceSummaryStats {
  frontend: number
  network: number
  backend: number
}

export interface PerformanceSummaryData {
  current: PerformanceSummaryStats
  previous: PerformanceSummaryStats
  change: PerformanceSummaryStats
}

interface CaptchaSummaryStats {
  generated: number
  passed: number
  passRate: number | null
  solveP50: number | null
  solveP75: number | null
  solveP95: number | null
  difficulty: { value: string; count: number }[]
  solveTime: { value: string; count: number }[]
}

export interface CaptchaSummaryData {
  current: CaptchaSummaryStats
  previous: CaptchaSummaryStats | null
}

export interface CustomEventRow {
  event: string
  count: number
}

export interface MetricSums {
  sum: number
  avg: number
}

export interface PagePropertyRow {
  property: string
  count: number
}

export interface MetadataRow {
  key: string
  value: string
  count: number
}

interface UserFlowNode {
  id: string
}

interface UserFlowLink {
  source: string
  target: string
  value: number
}

interface UserFlowGraph {
  nodes: UserFlowNode[]
  links: UserFlowLink[]
}

export interface UserFlowData {
  ascending: UserFlowGraph
  descending: UserFlowGraph
}

export interface ErrorListItem {
  eid: string
  name: string
  message: string | null
  filename: string | null
  count: number
  last_seen: string
  users: number
  sessions: number
  status: 'active' | 'regressed' | 'resolved'
}

export interface LiveVisitor {
  psid: string
  device: string | null
  browser: string | null
  os: string | null
  country: string | null
}

export interface LiveVisitorsData {
  count: number
  visitors: LiveVisitor[]
}

export type DimensionValues = string[] | { name: string; version: string }[]
