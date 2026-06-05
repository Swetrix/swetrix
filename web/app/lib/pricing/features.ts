export type PlanFeatureCode = 'featureFlags' | 'experiments' | 'replays'

export type ProjectFeatureAccess = Record<PlanFeatureCode, boolean>
