export interface TrafficCEFilterCHResponse {
  year: number
  month: number
  day?: number
  hour?: number
  count: number
}

export interface TrafficCHResponse {
  year: number
  month: number
  day?: number
  hour?: number
  sdur: number
  uniques: number
  pageviews: number
  bounces: number
}

export interface BirdseyeCHResponse {
  all: number
  unique: number
  users: number
  sdur: number
  bounces: number
}

export interface PerformanceCHResponse {
  year: number
  month: number
  day?: number
  hour?: number
  dns: number
  tls: number
  conn: number
  response: number
  render: number
  domLoad: number
  ttfb: number
}

export interface CustomsCHResponse {
  ev: string
  'count()': number
  index: number
}

export interface PropertiesCHResponse {
  property: string
  'count()': number
  index: number
}

export interface CustomsCHAggregatedResponse {
  year: number
  month: number
  day?: number
  hour?: number
  ev: string
  count: number
}

export interface IGetGroupFromTo {
  groupFrom: string
  groupTo: string
  groupFromUTC: string
  groupToUTC: string
}

export interface GetFiltersQuery extends Array<string | object | boolean> {
  // SQL query
  0: string
  // an object that has structure like { cf_pg: '/signup', ev_exclusive: false }
  1: { [key: string]: string | boolean }
  // an array of objects like [{ "column":"pg", "filter":"/signup", "isExclusive":true, "isContains":false }]
  2: Array<{ [key: string]: string }> | []
  // flag that indicates if there is an 'ev' filter for custom events
  3: boolean
}

export interface IGenerateXAxis {
  x: string[]
  xShifted: string[]
}

export interface IJourney {
  path: string[]
  value: number
  // of `value`, how many sessions continued past the last drawn step
  // (i.e. were truncated by the steps limit rather than ending there)
  continuedPast: number
}

export interface IJourneyLengthBucket {
  len: number
  sessions: number
  truncated: number
}

export interface IJourneys {
  journeys: IJourney[]
  // multi-page sessions only (single-page bounces produce no transitions)
  totalSessions: number
  // distinct paths before the top-N ranking was applied
  totalPaths: number
  lengthHistogram: IJourneyLengthBucket[]
}

export interface IJourneyNodeDetails {
  step: number
  page: string
  total: number
  sources: Record<string, number>
  countries: Record<string, number>
}

export interface IJourneyLinkDetails {
  step: number
  source: string
  // next page, or '__exit__' when the journey ended at the source node
  target: string
  total: number
  sources: Record<string, number>
  countries: Record<string, number>
}

export interface IExtractChartData {
  visits: number[]
  uniques: number[]
  sdur: number[]
  bounces?: number[]
}

export interface IAggregatedMetadata {
  key: string
  value: string
  count: number
}

export interface IFunnelCHResponse {
  level: number
  c: number
}

export interface IConversionTimeMetric {
  average: number | null
  median: number | null
  p75: number | null
}

export interface IFunnelBreakdowns {
  countries?: Record<string, number>
  devices?: Record<string, number>
  browsers?: Record<string, number>
  sources?: Record<string, number>
  campaigns?: Record<string, number>
  pages?: Record<string, number>
  profileTypes?: Record<string, number>
}

export interface IFunnel {
  value: string
  events: number
  eventsPerc: number
  eventsPercStep: number
  dropoff: number
  dropoffPercStep: number
  topCountries: Record<string, number>
  topSources: Record<string, number>
  breakdowns?: IFunnelBreakdowns
}

export interface IGetFunnel {
  funnel: IFunnel[]
  totalPageviews: number
  timeToConvert?: {
    fromSessionStart: IConversionTimeMetric
    fromFirstPage: IConversionTimeMetric
    fromFirstFunnelStep: IConversionTimeMetric
  }
}

interface IOverallPeriodStats {
  all: number
  unique: number
  users: number
  bounceRate: number
  sdur: number
}

interface IPerformanceObject {
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

interface IOverallChart {
  x: string[]
  visits: number[]
  bounces?: number[]
}

interface IOverallObject {
  current: IOverallPeriodStats
  previous: IOverallPeriodStats
  change: number
  uniqueChange?: number
  usersChange?: number
  bounceRateChange?: number
  sdurChange?: number
  chart?: IOverallChart
}

export interface IOverall {
  [key: string]: IOverallObject
}

export interface IOverallPerformance {
  [key: string]: IPerformanceObject
}

export interface IPageflow {
  type: 'pageview' | 'event' | 'error' | 'sale' | 'subscription' | 'refund'
  value: string
  created: string
  psid?: string
  metadata?: [string, string][]
}

export interface IPageProperty {
  [key: string]: number
}

export interface ICustomEvent {
  [key: string]: number
}

export type PerfMeasure = 'average' | 'median' | 'p95' | 'p75' | 'quantiles'
