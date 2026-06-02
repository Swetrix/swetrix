export type PlanFeatureCode = 'featureFlags' | 'experiments'

export type ProjectFeatureAccess = Record<PlanFeatureCode, boolean>
