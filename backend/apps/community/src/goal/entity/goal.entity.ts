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

export type GoalConditionRelation = 'AND' | 'OR'
export type GoalConditionEventType = 'any' | GoalType
export type GoalConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'exists'
  | 'not_exists'

export interface GoalCondition {
  id?: string
  eventType: GoalConditionEventType
  field: string
  operator: GoalConditionOperator
  value?: string
  metadataKey?: string
}

export interface GoalConditions {
  relation: GoalConditionRelation
  conditions: GoalCondition[]
}

export interface Goal {
  id: string
  name: string
  type: GoalType
  matchType: GoalMatchType
  value: string | null
  metadataFilters: MetadataFilter[] | null
  conditions: GoalConditions | null
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
  metadataFilters: string | null
  conditions: string | null
  active: number
  projectId: string
  created: string
}
