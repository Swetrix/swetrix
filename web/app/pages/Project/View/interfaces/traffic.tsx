export interface IFilter {
  column: string
  filter: string
  isExclusive: boolean
}

export enum ProjectViewCustomEventMetaValueType {
  STRING = 'string',
  INTEGER = 'integer',
  FLOAT = 'float',
}

export interface IProjectViewCustomEvent {
  id: string
  customEventName: string
  metaKey?: string
  metaValue?: string
  metricKey: string
  metaValueType: ProjectViewCustomEventMetaValueType
}

export interface IProjectView {
  id: string
  name: string
  filters?: IFilter[]
  customEvents?: IProjectViewCustomEvent[]
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

interface IMetric {
  sum: number
  avg: number
}

export interface ITrafficMeta {
  key: string
  current: IMetric
  previous: IMetric
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
  meta?: ITrafficMeta[]
}
