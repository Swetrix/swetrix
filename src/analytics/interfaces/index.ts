export interface ChartCHResponse {
  index: number
  unique: number
  'count()': number
}

export interface CustomsCHResponse {
  ev: string
  'count()': number
  index: number
}

export interface IGetGroupFromTo {
  groupFrom: string
  groupTo: string
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

export interface IGenerateXAxis {
  x: string[]
  xM: string[]
}

export interface IExtractChartData {
  visits: number[]
  uniques: number[]
  sdur: number[]
}
