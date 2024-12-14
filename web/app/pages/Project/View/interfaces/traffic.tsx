export interface Filter {
  column: string
  filter: string
  isExclusive: boolean
}

export enum ProjectViewCustomEventMetaValueType {
  STRING = 'string',
  INTEGER = 'integer',
  FLOAT = 'float',
}

export interface ProjectViewCustomEvent {
  id: string
  customEventName: string
  metaKey?: string
  metaValue?: string
  metricKey: string
  metaValueType: ProjectViewCustomEventMetaValueType
}

export interface ProjectView {
  id: string
  name: string
  filters?: Filter[]
  customEvents?: ProjectViewCustomEvent[]
}

interface Param {
  name: string
  count: number
}

export interface Params {
  [key: string]: Param[]
}

export interface Customs {
  [key: string]: number
}

export interface Properties {
  [key: string]: number
}

interface Metric {
  sum: number
  avg: number
}

export interface TrafficMeta {
  key: string
  current: Metric
  previous: Metric
}

export interface TrafficLogResponse {
  params?: Params
  chart?: {
    x: string[]
    visits: number[]
    uniques: number[]
    sdur: number[]
  }
  customs: Customs
  properties: Properties
  appliedFilters?: Filter[]
  timeBucket?: string[]
  meta?: TrafficMeta[]
}
