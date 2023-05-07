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
}

export enum DateRelativeToUTC {
  TODAY = 'today',
  YESTERDAY = 'yesterday',
  TOMORROW = 'tomorrow',
}

export enum TimeBucketToDateFormat {
  hour = 'YYYY-MM-DD HH:mm:ss',
  day = 'YYYY-MM-DD',
  week = 'YYYY-MM-DD',
  month = 'YYYY-MM',
}

export interface GetFiltersQuery extends Array<string | object> {
  // SQL query
  0: string
  // an object that has structure like { cf_pg: '/signup', ev_exclusive: false }
  1: { [key: string]: string | boolean }
  // an array of objects like [{ "column":"pg", "filter":"/signup", "isExclusive":true }]
  2: Array<{ [key: string]: string }> | []
}

export interface IUserFlowNode {
  id: string
}

export interface IUserFlowLink {
  source: string
  target: string
  value: number
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
