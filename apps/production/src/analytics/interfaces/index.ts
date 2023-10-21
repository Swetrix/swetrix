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
  // an array of objects like [{ "column":"pg", "filter":"/signup", "isExclusive":true }]
  2: Array<{ [key: string]: string }> | []
  // flag that indicates if there is an 'ev' filter for custom events
  3: boolean
}

export interface IUserFlowNode {
  id: string
}

export interface IUserFlowLink {
  source: string
  target: string
  value: number
}

export interface IGenerateXAxis {
  x: string[]
  xShifted: string[]
}

export interface IBuildUserFlow {
  nodes: IUserFlowNode[]
  links: IUserFlowLink[]
}

export interface IUserFlow {
  ascending: IBuildUserFlow
  descending: IBuildUserFlow
}

export interface IExtractChartData {
  visits: number[]
  uniques: number[]
  sdur: number[]
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

export interface IFunnel {
  value: string
  events: number
  eventsPerc: number
  eventsPercStep: number
  dropoff: number
  dropoffPercStep: number
}

export interface IGetFunnel {
  funnel: IFunnel[]
  totalPageviews: number
}
