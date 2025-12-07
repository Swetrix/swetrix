export type GoalType = 'pageview' | 'custom_event'
export type GoalMatchType = 'exact' | 'contains'

export interface MetadataFilter {
  key: string
  value: string
}

export interface Goal {
  id: string
  name: string
  type: GoalType
  matchType: GoalMatchType
  value: string | null
  metadataFilters: MetadataFilter[] | null
  active: boolean
  pid: string
  created: string
}

export interface GoalStats {
  conversions: number
  uniqueSessions: number
  conversionRate: number
  previousConversions: number
  trend: number
}

export interface GoalChartData {
  time: string
  conversions: number
  uniqueSessions: number
}

export interface GoalSession {
  psid: string
  country: string | null
  browser: string | null
  os: string | null
  device: string | null
  firstConversion: string
  conversionCount: number
}

export const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  pageview: 'Pageview',
  custom_event: 'Custom Event',
}

export const GOAL_MATCH_TYPE_LABELS: Record<GoalMatchType, string> = {
  exact: 'Exact match',
  contains: 'Contains',
}
