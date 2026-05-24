import {
  FeatureFlagSchedule,
  FeatureFlagStaleReason,
  FeatureFlagStatus,
  FeatureFlagType,
  TargetingRule,
  EvaluatableFeatureFlag,
} from '../evaluation'

// Re-export types for backward compatibility
export {
  FeatureFlagSchedule,
  FeatureFlagStaleReason,
  FeatureFlagStatus,
  FeatureFlagType,
  TargetingRule,
}

export interface FeatureFlag extends EvaluatableFeatureFlag {
  id: string
  description: string | null
  experimentId: string | null
  scheduledChange: FeatureFlagSchedule | null
  killSwitchActive: boolean
  killSwitchValue: boolean
  killedAt: string | null
  targetingUpdatedAt: string | null
  projectId: string
  created: string
  updated: string
}

export interface ClickhouseFeatureFlag {
  id: string
  key: string
  description: string | null
  flagType: string
  rolloutPercentage: number
  targetingRules: string | null // JSON string in ClickHouse
  enabled: number // Int8 in ClickHouse
  experimentId: string | null
  scheduledChange: string | null
  killSwitchActive: number
  killSwitchValue: number
  killedAt: string | null
  targetingUpdatedAt: string | null
  projectId: string
  created: string
  updated: string
}
