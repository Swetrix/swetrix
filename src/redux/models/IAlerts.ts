import { QUERY_METRIC, QUERY_CONDITION, QUERY_TIME } from '../constants'

export interface IAlerts {
    id: string
    name: string
    active: boolean
    created: string
    lastTriggered: string | null
    queryMetric: keyof typeof QUERY_METRIC
    queryCondition: keyof typeof QUERY_CONDITION
    queryValue: number
    queryTime: keyof typeof QUERY_TIME
    pid: string
}
