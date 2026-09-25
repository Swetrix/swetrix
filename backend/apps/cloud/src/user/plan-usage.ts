export const TRAFFIC_SPIKE_ALLOWED_PERCENTAGE = 0.3
export const REPEATED_OVERAGE_ALLOWED_PERCENTAGE = 0.1
export const PLAN_USAGE_GRACE_DAYS = 14

export function evaluatePlanUsage(
  limit: number,
  thisMonthUsage: number,
  lastMonthUsage: number,
) {
  const hitPercentageLimit =
    thisMonthUsage > Math.floor(limit * (1 + TRAFFIC_SPIKE_ALLOWED_PERCENTAGE))
  const repeatedLimit = Math.floor(
    limit * (1 + REPEATED_OVERAGE_ALLOWED_PERCENTAGE),
  )
  const repeatedOverage =
    thisMonthUsage > repeatedLimit && lastMonthUsage > repeatedLimit

  return {
    thisMonthUsage,
    lastMonthUsage,
    hitPercentageLimit,
    exceedsLimit: hitPercentageLimit || repeatedOverage,
  }
}

export type PlanUsage = ReturnType<typeof evaluatePlanUsage>
