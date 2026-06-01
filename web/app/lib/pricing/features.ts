import { PLAN_TYPES, type PlanTypeCode } from './catalog'

export type PlanFeatureCode = 'featureFlags' | 'experiments'

export type ProjectFeatureAccess = Record<PlanFeatureCode, boolean>

export const PLAN_FEATURE_REQUIRED_PLAN = {
  featureFlags: 'plus',
  experiments: 'plus',
} as const satisfies Record<PlanFeatureCode, PlanTypeCode>

export const planTypeHasFeature = (
  planType: PlanTypeCode | null | undefined,
  feature: PlanFeatureCode,
) => {
  if (!planType) {
    return false
  }

  return (
    PLAN_TYPES[planType].sortOrder >=
    PLAN_TYPES[PLAN_FEATURE_REQUIRED_PLAN[feature]].sortOrder
  )
}
