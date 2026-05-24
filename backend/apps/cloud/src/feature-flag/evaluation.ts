import * as crypto from 'crypto'

/**
 * Feature flag type enum
 */
export enum FeatureFlagType {
  BOOLEAN = 'boolean',
  ROLLOUT = 'rollout',
}

/**
 * Targeting rule interface for feature flags
 */
export interface TargetingRule {
  column: string // cc, dv, br, os, pg, etc.
  filter: string // value to match
  isExclusive: boolean // true = exclude, false = include
}

export interface FeatureFlagSchedule {
  enabled?: boolean
  rolloutPercentage?: number
  applyAt: string | Date
}

export enum FeatureFlagStatus {
  ENABLED = 'enabled',
  DISABLED = 'disabled',
  SCHEDULED = 'scheduled',
  KILLED = 'killed',
  STALE = 'stale',
}

export enum FeatureFlagStaleReason {
  NOT_EVALUATED_RECENTLY = 'not_evaluated_recently',
  PERMANENT_ROLLOUT = 'permanent_rollout',
  TARGETING_UNCHANGED = 'targeting_unchanged',
  COMPLETED_EXPERIMENT = 'completed_experiment',
}

/**
 * Minimal feature flag interface required for evaluation
 * Both cloud (TypeORM entity) and community (ClickHouse) flags should satisfy this
 */
interface EvaluatableFeatureFlag {
  key: string
  enabled: boolean
  flagType: FeatureFlagType
  rolloutPercentage: number
  targetingRules: TargetingRule[] | null
  scheduledChange?: FeatureFlagSchedule | null
  killSwitchActive?: boolean
  killSwitchValue?: boolean
}

/**
 * Evaluates all feature flags for a project given visitor attributes
 */
export function evaluateFlags(
  flags: EvaluatableFeatureFlag[],
  profileId: string,
  attributes?: Record<string, string>,
): Record<string, boolean> {
  const result: Record<string, boolean> = {}

  for (const flag of flags) {
    result[flag.key] = evaluateFlag(flag, profileId, attributes)
  }

  return result
}

/**
 * Evaluates a single feature flag for a visitor
 */
export function evaluateFlag(
  flag: EvaluatableFeatureFlag,
  profileId: string,
  attributes?: Record<string, string>,
): boolean {
  if (flag.killSwitchActive) {
    return Boolean(flag.killSwitchValue)
  }

  const effectiveFlag = applyDueScheduledChange(flag)

  if (!effectiveFlag.enabled) {
    return false
  }

  if (effectiveFlag.targetingRules && effectiveFlag.targetingRules.length > 0) {
    const matchesTargeting = matchesTargetingRules(
      effectiveFlag.targetingRules,
      attributes,
    )
    if (!matchesTargeting) {
      return false
    }
  }

  if (effectiveFlag.flagType === FeatureFlagType.BOOLEAN) {
    return true
  }

  if (effectiveFlag.flagType === FeatureFlagType.ROLLOUT) {
    return isInRolloutPercentage(
      effectiveFlag.key,
      effectiveFlag.rolloutPercentage,
      profileId,
    )
  }

  return false
}

export function applyDueScheduledChange<T extends EvaluatableFeatureFlag>(
  flag: T,
  now = new Date(),
): T {
  if (!isScheduledChangeDue(flag.scheduledChange, now)) {
    return flag
  }

  const scheduledChange = flag.scheduledChange

  return {
    ...flag,
    enabled: scheduledChange.enabled ?? flag.enabled,
    rolloutPercentage:
      scheduledChange.rolloutPercentage ?? flag.rolloutPercentage,
    scheduledChange: null,
  }
}

export function isScheduledChangeDue(
  scheduledChange?: FeatureFlagSchedule | null,
  now = new Date(),
): scheduledChange is FeatureFlagSchedule {
  if (!scheduledChange?.applyAt) {
    return false
  }

  const applyAt = new Date(scheduledChange.applyAt)

  if (Number.isNaN(applyAt.getTime())) {
    return false
  }

  return applyAt.getTime() <= now.getTime()
}

/**
 * Checks if visitor attributes match the targeting rules
 * Rules are evaluated as AND (all rules must match)
 */
function matchesTargetingRules(
  rules: TargetingRule[],
  attributes?: Record<string, string>,
): boolean {
  for (const rule of rules) {
    const attributeValue = attributes?.[rule.column]

    if (attributeValue === undefined) {
      if (!rule.isExclusive) {
        return false
      }
      continue
    }

    const matches = matchesRule(attributeValue, rule.filter)

    if (rule.isExclusive) {
      if (matches) {
        return false
      }
    } else {
      if (!matches) {
        return false
      }
    }
  }

  return true
}

/**
 * Checks if an attribute value matches a filter value
 * Supports case-insensitive matching
 */
function matchesRule(attributeValue: string, filterValue: string): boolean {
  return attributeValue.toLowerCase() === filterValue.toLowerCase()
}

/**
 * Determines if a visitor is within the rollout percentage
 * Uses consistent hashing based on flag key and profile ID
 */
function isInRolloutPercentage(
  flagKey: string,
  percentage: number,
  profileId: string,
): boolean {
  if (percentage >= 100) {
    return true
  }
  if (percentage <= 0) {
    return false
  }

  const hash = crypto
    .createHash('sha256')
    .update(`${flagKey}:${profileId}`)
    .digest('hex')

  const hashValue = parseInt(hash.substring(0, 8), 16)

  const normalizedValue = (hashValue / 0xffffffff) * 100

  return normalizedValue < percentage
}

/**
 * Experiment variant interface
 */
interface ExperimentVariant {
  key: string
  rolloutPercentage: number
}

/**
 * Determines which experiment variant a user should see
 * Uses consistent hashing to ensure the same user always sees the same variant
 *
 * @param experimentId - The experiment ID
 * @param variants - Array of variants with their rollout percentages
 * @param profileId - The user's profile ID
 * @returns The key of the variant the user should see, or null if no match
 */
export function getExperimentVariant(
  experimentId: string,
  variants: ExperimentVariant[],
  profileId: string,
): string | null {
  if (variants.length === 0) {
    return null
  }

  const hash = crypto
    .createHash('sha256')
    .update(`experiment:${experimentId}:${profileId}`)
    .digest('hex')

  const hashValue = parseInt(hash.substring(0, 8), 16)

  const normalizedValue = (hashValue / 0x100000000) * 100

  let cumulativePercentage = 0
  for (const variant of variants) {
    cumulativePercentage += variant.rolloutPercentage
    if (normalizedValue < cumulativePercentage) {
      return variant.key
    }
  }

  return null
}
