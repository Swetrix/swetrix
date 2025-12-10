export enum FeatureFlagType {
  BOOLEAN = 'boolean',
  ROLLOUT = 'rollout',
}

export interface TargetingRule {
  column: string // cc, dv, br, os, pg, etc.
  filter: string // value to match
  isExclusive: boolean // true = exclude, false = include
}

export interface FeatureFlag {
  id: string
  key: string
  description: string | null
  flagType: FeatureFlagType
  rolloutPercentage: number
  targetingRules: TargetingRule[] | null
  enabled: boolean
  projectId: string
  created: string
}

export interface ClickhouseFeatureFlag {
  id: string
  key: string
  description: string | null
  flagType: string
  rolloutPercentage: number
  targetingRules: string | null // JSON string in ClickHouse
  enabled: number // Int8 in ClickHouse
  projectId: string
  created: string
}
