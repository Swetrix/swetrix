import { PlanCode, PlanType, User } from '../entities/user.entity.js'

const paidPlanCodes = new Set<string>([
  PlanCode.hobby,
  PlanCode.freelancer,
  PlanCode['50k'],
  PlanCode['100k'],
  PlanCode['200k'],
  PlanCode['500k'],
  PlanCode['1m'],
  PlanCode['2m'],
  PlanCode['5m'],
  PlanCode['10m'],
  PlanCode['15m'],
  PlanCode['20m'],
  PlanCode['30m'],
  PlanCode['40m'],
  PlanCode['50m'],
])

export const eventBuckets: Record<string, number> = {
  [PlanCode.none]: 0,
  [PlanCode.free]: 5000,
  [PlanCode.trial]: 10000000,
  [PlanCode.hobby]: 10000,
  [PlanCode['50k']]: 50000,
  [PlanCode.freelancer]: 100000,
  [PlanCode['100k']]: 100000,
  [PlanCode['200k']]: 200000,
  [PlanCode['500k']]: 500000,
  [PlanCode['1m']]: 1000000,
  [PlanCode['2m']]: 2000000,
  [PlanCode['5m']]: 5000000,
  [PlanCode['10m']]: 10000000,
  [PlanCode['15m']]: 15000000,
  [PlanCode['20m']]: 20000000,
  [PlanCode['30m']]: 30000000,
  [PlanCode['40m']]: 40000000,
  [PlanCode['50m']]: 50000000,
}

export const planEntitlements = {
  [PlanType.standard]: {
    websites: 50,
    teamMembers: 10,
    organisations: 3,
    apiRateLimitPerHour: 600,
    sessionReplaysIncluded: 0,
  },
  [PlanType.plus]: {
    websites: 100,
    teamMembers: 25,
    organisations: 10,
    apiRateLimitPerHour: 5000,
    sessionReplaysIncluded: 'byEventTier',
  },
  [PlanType.enterprise]: {
    websites: 'custom',
    teamMembers: 'custom',
    organisations: 'custom',
    apiRateLimitPerHour: 'custom',
    sessionReplaysIncluded: 'custom',
  },
} as const

const sessionReplayQuotas: Partial<Record<PlanCode, number>> = {
  [PlanCode['100k']]: 5000,
  [PlanCode['200k']]: 10000,
  [PlanCode['500k']]: 25000,
  [PlanCode['1m']]: 50000,
  [PlanCode['2m']]: 100000,
  [PlanCode['5m']]: 250000,
  [PlanCode['10m']]: 500000,
  [PlanCode['15m']]: 750000,
  [PlanCode['20m']]: 1000000,
  [PlanCode['30m']]: 1500000,
  [PlanCode['40m']]: 2000000,
  [PlanCode['50m']]: 2500000,
}

const numberValue = (source: Record<string, unknown> | null, key: string) =>
  source && typeof source[key] === 'number' ? (source[key] as number) : null

export const getEffectivePlanType = (user: User): PlanType | null => {
  if (user.planType) return user.planType
  if (paidPlanCodes.has(user.planCode)) return PlanType.standard
  return null
}

export const getEffectiveLimits = (user: User) => {
  const planType = getEffectivePlanType(user) || PlanType.standard
  const entitlements = planEntitlements[planType]
  const addonWebsites =
    numberValue(user.addonOverrides, 'websites') ||
    numberValue(user.addonOverrides, 'additionalWebsites') ||
    0
  const websiteOverride = numberValue(user.entitlementOverrides, 'websites')
  const apiOverride = numberValue(
    user.entitlementOverrides,
    'apiRateLimitPerHour',
  )
  const replayOverride = numberValue(
    user.entitlementOverrides,
    'sessionReplaysIncluded',
  )
  const replayQuota =
    replayOverride ??
    (entitlements.sessionReplaysIncluded === 'byEventTier'
      ? sessionReplayQuotas[user.planCode] || 0
      : entitlements.sessionReplaysIncluded)
  const websites =
    websiteOverride ??
    (typeof entitlements.websites === 'number'
      ? entitlements.websites
      : user.maxProjects)
  const apiRateLimitPerHour =
    apiOverride ??
    (typeof entitlements.apiRateLimitPerHour === 'number'
      ? entitlements.apiRateLimitPerHour
      : user.maxApiKeyRequestsPerHour)

  return {
    planType,
    eventBucket: eventBuckets[user.planCode] || 0,
    websitesIncluded:
      typeof websites === 'number' ? websites + addonWebsites : websites,
    purchasedWebsiteAddons: addonWebsites,
    replayQuota,
    apiRateLimitPerHour,
  }
}
