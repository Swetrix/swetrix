import { TimeBucket } from '~/lib/constants'

export interface Filter {
  column: string
  filter: string
  isExclusive: boolean
  // When true, this filter uses substring match (contains/not contains) instead of equality
  isContains?: boolean
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

export type Params = Record<string, Param[]>

export type Customs = Record<string, number>

export type Properties = Record<string, number>

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
  chart: {
    x: string[]
    visits: number[]
    uniques: number[]
    sdur: number[]
  }
  customs: Customs
  properties: Properties
  appliedFilters?: Filter[]
  timeBucket?: TimeBucket[]
  meta?: TrafficMeta[]
}
