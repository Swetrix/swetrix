import { QUERY_METRIC, QUERY_CONDITION, QUERY_TIME } from '../constants'

export interface Alerts {
  id: string
  name: string
  active: boolean
  created: string
  lastTriggered: string | null
  queryMetric: (typeof QUERY_METRIC)[keyof typeof QUERY_METRIC]
  queryCondition: (typeof QUERY_CONDITION)[keyof typeof QUERY_CONDITION]
  queryValue: number
  queryTime: (typeof QUERY_TIME)[keyof typeof QUERY_TIME]
  pid: string
  queryCustomEvent?: string
}
