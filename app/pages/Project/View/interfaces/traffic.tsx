export interface IFilter {
  column: string
  filter: string
  isExclusive: boolean
}

interface IParam {
  name: string
  count: number
}

export interface IParams {
  [key: string]: IParam[]
}

export interface ICustoms {
  [key: string]: number
}

export interface IProperties {
  [key: string]: number
}

export interface ITrafficLogResponse {
  params?: IParams
  chart?: {
    x: string[]
    visits: number[]
    uniques: number[]
    sdur: number[]
  }
  customs: ICustoms
  properties: IProperties
  appliedFilters?: IFilter[]
  timeBucket?: string[]
}
