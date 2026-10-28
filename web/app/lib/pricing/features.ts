export type PlanFeatureCode =
  | 'featureFlags'
  | 'experiments'
  | 'replays'
  | 'dataWarehouse'

export type ProjectFeatureAccess = Record<PlanFeatureCode, boolean>
