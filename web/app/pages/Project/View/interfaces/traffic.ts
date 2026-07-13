import { TimeBucket } from '~/lib/constants'

// Legacy (v1) filter shape — still used by saved project views (server-side format)
interface Filter {
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

type Params = Record<string, Param[]>

export type Customs = Record<string, number>

type Properties = Record<string, number>

interface Metric {
  sum: number
  avg: number
}

interface TrafficMeta {
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
    bounces?: number[]
    concurrency?: number[]
  }
  customs: Customs
  properties: Properties
  appliedFilters?: Filter[]
  timeBucket?: TimeBucket[]
  meta?: TrafficMeta[]
}
