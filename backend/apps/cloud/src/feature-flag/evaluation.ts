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

/**
 * Minimal feature flag interface required for evaluation
 * Both cloud (TypeORM entity) and community (ClickHouse) flags should satisfy this
 */
export interface EvaluatableFeatureFlag {
  key: string
  enabled: boolean
  flagType: FeatureFlagType
  rolloutPercentage: number
  targetingRules: TargetingRule[] | null
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
  // If flag is disabled, always return false
  if (!flag.enabled) {
    return false
  }

  // Check targeting rules if any exist
  if (flag.targetingRules && flag.targetingRules.length > 0) {
    const matchesTargeting = matchesTargetingRules(
      flag.targetingRules,
      attributes,
    )
    if (!matchesTargeting) {
      return false
    }
  }

  // For boolean flags, return true if enabled and targeting matches
  if (flag.flagType === FeatureFlagType.BOOLEAN) {
    return true
  }

  // For rollout flags, use percentage-based rollout
  if (flag.flagType === FeatureFlagType.ROLLOUT) {
    return isInRolloutPercentage(flag.key, flag.rolloutPercentage, profileId)
  }

  return false
}

/**
 * Checks if visitor attributes match the targeting rules
 * Rules are evaluated as AND (all rules must match)
 */
export function matchesTargetingRules(
  rules: TargetingRule[],
  attributes?: Record<string, string>,
): boolean {
  if (!attributes) {
    // If no attributes provided, we can't match any rules
    // Return true to be permissive (flag will be shown)
    return true
  }

  for (const rule of rules) {
    const attributeValue = attributes[rule.column]

    // Check if we have the attribute
    if (attributeValue === undefined) {
      // If attribute not provided, skip this rule (be permissive)
      continue
    }

    const matches = matchesRule(attributeValue, rule.filter)

    // If isExclusive (exclude), we want the rule to NOT match
    // If not isExclusive (include), we want the rule to match
    if (rule.isExclusive) {
      // Exclude: if it matches, targeting fails
      if (matches) {
        return false
      }
    } else {
      // Include: if it doesn't match, targeting fails
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
export function matchesRule(
  attributeValue: string,
  filterValue: string,
): boolean {
  // Case-insensitive exact match
  return attributeValue.toLowerCase() === filterValue.toLowerCase()
}

/**
 * Determines if a visitor is within the rollout percentage
 * Uses consistent hashing based on flag key and profile ID
 */
export function isInRolloutPercentage(
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

  // Create a consistent hash based on flag key and profile ID
  // Using SHA-256 for better cryptographic properties
  const hash = crypto
    .createHash('sha256')
    .update(`${flagKey}:${profileId}`)
    .digest('hex')

  // Convert first 8 hex characters to a number (0 to 2^32-1)
  const hashValue = parseInt(hash.substring(0, 8), 16)

  // Normalize to 0-100 range
  const normalizedValue = (hashValue / 0xffffffff) * 100

  return normalizedValue < percentage
}

/**
 * Experiment variant interface
 */
export interface ExperimentVariant {
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

  // Create a consistent hash based on experiment ID and profile ID
  const hash = crypto
    .createHash('sha256')
    .update(`experiment:${experimentId}:${profileId}`)
    .digest('hex')

  // Convert first 8 hex characters to a number (0 to 2^32-1)
  const hashValue = parseInt(hash.substring(0, 8), 16)

  // Normalize to 0-100 range
  const normalizedValue = (hashValue / 0xffffffff) * 100

  // Assign to variant based on cumulative percentages
  let cumulativePercentage = 0
  for (const variant of variants) {
    cumulativePercentage += variant.rolloutPercentage
    if (normalizedValue < cumulativePercentage) {
      return variant.key
    }
  }

  // Fallback to last variant (shouldn't happen if percentages sum to 100)
  return variants[variants.length - 1].key
}
