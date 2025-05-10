import { QUERY_METRIC, QUERY_CONDITION, QUERY_TIME } from '../constants'

export interface Alerts {
  id: string
  pid: string
  name: string
  queryMetric: (typeof QUERY_METRIC)[keyof typeof QUERY_METRIC]
  queryCondition: (typeof QUERY_CONDITION)[keyof typeof QUERY_CONDITION] | null
  queryValue: number | null
  queryTime: (typeof QUERY_TIME)[keyof typeof QUERY_TIME] | null
  queryCustomEvent?: string
  active: boolean
  lastTriggered: string | null
  alertOnNewErrorsOnly?: boolean
}
