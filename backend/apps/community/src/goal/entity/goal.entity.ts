export enum GoalType {
  PAGEVIEW = 'pageview',
  CUSTOM_EVENT = 'custom_event',
}

export enum GoalMatchType {
  EXACT = 'exact',
  CONTAINS = 'contains',
}

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
  projectId: string
  created: string
}

export interface ClickhouseGoal {
  id: string
  name: string
  type: string
  matchType: string
  value: string | null
  metadataFilters: string | null // JSON string in ClickHouse
  active: number // Int8 in ClickHouse
  projectId: string
  created: string
}
