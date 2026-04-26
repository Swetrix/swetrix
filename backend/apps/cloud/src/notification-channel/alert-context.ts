import { QueryCondition, QueryMetric, QueryTime } from '../alert/dto/alert.dto'

export interface AlertContextBase {
  alert_name: string
  project_name: string
  project_id: string
  dashboard_url: string
  value: number
  threshold: number | null
  condition: string | null
  time_window: string | null
  metric: QueryMetric
}

export interface AlertContextErrors extends AlertContextBase {
  error_count: number
  error_message: string
  error_name: string
  errors_url: string
  is_new_only: boolean
}

export interface AlertContextCustomEvents extends AlertContextBase {
  event_name: string
  event_count: number
  every_event_mode: boolean
}

export interface AlertContextPageViews extends AlertContextBase {
  views?: number
  unique_views?: number
}

export interface AlertContextOnline extends AlertContextBase {
  online_count: number
}

export type AlertContext =
  | AlertContextErrors
  | AlertContextCustomEvents
  | AlertContextPageViews
  | AlertContextOnline
  | AlertContextBase

export const QUERY_CONDITION_LABEL: Record<QueryCondition, string> = {
  [QueryCondition.GREATER_THAN]: 'greater than',
  [QueryCondition.GREATER_EQUAL_THAN]: 'greater than or equal to',
  [QueryCondition.LESS_THAN]: 'less than',
  [QueryCondition.LESS_EQUAL_THAN]: 'less than or equal to',
}

export const QUERY_TIME_LABEL: Record<QueryTime, string> = {
  [QueryTime.LAST_15_MINUTES]: '15 minutes',
  [QueryTime.LAST_30_MINUTES]: '30 minutes',
  [QueryTime.LAST_1_HOUR]: '1 hour',
  [QueryTime.LAST_4_HOURS]: '4 hours',
  [QueryTime.LAST_24_HOURS]: '24 hours',
  [QueryTime.LAST_48_HOURS]: '48 hours',
}
