import {
  FeatureFlagType,
  TargetingRule,
  EvaluatableFeatureFlag,
} from '../evaluation'

// Re-export types for backward compatibility
export { FeatureFlagType, TargetingRule }

export interface FeatureFlag extends EvaluatableFeatureFlag {
  id: string
  description: string | null
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
