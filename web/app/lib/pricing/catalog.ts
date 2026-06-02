export type CurrencyCode = 'USD' | 'EUR' | 'GBP'
export type BillingInterval = 'monthly' | 'yearly'
export type PlanTypeCode = 'standard' | 'plus' | 'enterprise'
export type EventTierCode =
  | '100k'
  | '200k'
  | '500k'
  | '1m'
  | '2m'
  | '5m'
  | '10m'
  | '15m'
  | '20m'
  | '30m'
  | '40m'
  | '50m'

export type PlanCode =
  | 'none'
  | 'free'
  | 'trial'
  | 'hobby'
  | '50k'
  | 'freelancer'
  | '100k'
  | '200k'
  | '500k'
  | '1m'
  | '2m'
  | '5m'
  | '10m'
  | '15m'
  | '20m'
  | '30m'
  | '40m'
  | '50m'

interface PlanPrice {
  amount: number
  paddlePlanId: number | null
}

export interface PlanLimit {
  index: number
  planCode: PlanCode
  monthlyUsageLimit: number
  legacy: boolean
  price: Record<CurrencyCode, Record<BillingInterval, number>>
  pid?: number
  ypid?: number
  maxAlerts: number
}

type PlanPriceCatalog = Record<
  PlanTypeCode,
  Partial<
    Record<
      EventTierCode,
      Record<BillingInterval, Record<CurrencyCode, PlanPrice>>
    >
  >
>

export const PLAN_TYPES = {
  standard: {
    nameKey: 'pricing.planTypes.standard.name',
    sortOrder: 1,
    descriptionKey: 'pricing.planTypes.standard.description',
    ctaKey: 'pricing.planTypes.standard.cta',
  },
  plus: {
    nameKey: 'pricing.planTypes.plus.name',
    sortOrder: 2,
    descriptionKey: 'pricing.planTypes.plus.description',
    ctaKey: 'pricing.planTypes.plus.cta',
  },
  enterprise: {
    nameKey: 'pricing.planTypes.enterprise.name',
    sortOrder: 3,
    contactSales: true,
    descriptionKey: 'pricing.planTypes.enterprise.description',
    ctaKey: 'pricing.planTypes.enterprise.cta',
  },
} as const satisfies Record<
  PlanTypeCode,
  {
    nameKey: string
    sortOrder: number
    descriptionKey: string
    ctaKey: string
    contactSales?: boolean
  }
>

export const EVENT_TIERS = {
  '100k': { monthlyEvents: 100000, sortOrder: 1, planCode: '100k' },
  '200k': { monthlyEvents: 200000, sortOrder: 2, planCode: '200k' },
  '500k': { monthlyEvents: 500000, sortOrder: 3, planCode: '500k' },
  '1m': { monthlyEvents: 1000000, sortOrder: 4, planCode: '1m' },
  '2m': { monthlyEvents: 2000000, sortOrder: 5, planCode: '2m' },
  '5m': { monthlyEvents: 5000000, sortOrder: 6, planCode: '5m' },
  '10m': { monthlyEvents: 10000000, sortOrder: 7, planCode: '10m' },
  '15m': { monthlyEvents: 15000000, sortOrder: 8, planCode: '15m' },
  '20m': { monthlyEvents: 20000000, sortOrder: 9, planCode: '20m' },
  '30m': { monthlyEvents: 30000000, sortOrder: 10, planCode: '30m' },
  '40m': { monthlyEvents: 40000000, sortOrder: 11, planCode: '40m' },
  '50m': { monthlyEvents: 50000000, sortOrder: 12, planCode: '50m' },
} as const satisfies Record<
  EventTierCode,
  { monthlyEvents: number; sortOrder: number; planCode: PlanCode }
>

export const EVENT_TIER_CODES = Object.keys(EVENT_TIERS) as EventTierCode[]
export const SELF_SERVE_PLAN_TYPES: PlanTypeCode[] = ['standard', 'plus']

const isProduction = () =>
  typeof window === 'undefined'
    ? process.env.NODE_ENV === 'production'
    : window.REMIX_ENV?.NODE_ENV === 'production'

/**
 * Paddle receives one product_id per billing interval; USD/EUR/GBP share it and
 * rely on Paddle localized pricing/overrides for country and locale checkout.
 */
const price = (
  monthly: Record<CurrencyCode, number>,
  yearly: Record<CurrencyCode, number>,
  paddleMonthly: number | null = null,
  paddleYearly: number | null = null,
): Record<BillingInterval, Record<CurrencyCode, PlanPrice>> => ({
  monthly: {
    USD: { amount: monthly.USD, paddlePlanId: paddleMonthly },
    EUR: { amount: monthly.EUR, paddlePlanId: paddleMonthly },
    GBP: { amount: monthly.GBP, paddlePlanId: paddleMonthly },
  },
  yearly: {
    USD: { amount: yearly.USD, paddlePlanId: paddleYearly },
    EUR: { amount: yearly.EUR, paddlePlanId: paddleYearly },
    GBP: { amount: yearly.GBP, paddlePlanId: paddleYearly },
  },
})

const assertCatalogPrice = (
  eventTierCode: EventTierCode,
  billingInterval: BillingInterval,
  currencyCode: CurrencyCode,
  planPrice: PlanPrice | undefined,
): PlanPrice => {
  if (
    planPrice &&
    typeof planPrice.amount === 'number' &&
    Number.isFinite(planPrice.amount) &&
    planPrice.paddlePlanId
  ) {
    return planPrice
  }

  const message = `Missing PLAN_PRICES.standard.${eventTierCode}.${billingInterval}.${currencyCode} amount or paddlePlanId`

  if (!isProduction()) {
    throw new Error(message)
  }

  console.warn(message)
  return { amount: 0, paddlePlanId: null }
}

const PLAN_PRICES: PlanPriceCatalog = {
  standard: {
    '100k': price(
      { USD: 19, EUR: 17, GBP: 15 },
      { USD: 190, EUR: 170, GBP: 150 },
      916455,
      916456,
    ),
    '200k': price(
      { USD: 29, EUR: 25, GBP: 23 },
      { USD: 290, EUR: 250, GBP: 230 },
      854654,
      854655,
    ),
    '500k': price(
      { USD: 49, EUR: 42, GBP: 39 },
      { USD: 490, EUR: 420, GBP: 390 },
      854656,
      854657,
    ),
    '1m': price(
      { USD: 79, EUR: 69, GBP: 59 },
      { USD: 790, EUR: 690, GBP: 590 },
      752317,
      776470,
    ),
    '2m': price(
      { USD: 119, EUR: 99, GBP: 89 },
      { USD: 1190, EUR: 990, GBP: 890 },
      854663,
      854664,
    ),
    '5m': price(
      { USD: 179, EUR: 149, GBP: 139 },
      { USD: 1790, EUR: 1490, GBP: 1390 },
      752318,
      776471,
    ),
    '10m': price(
      { USD: 249, EUR: 209, GBP: 189 },
      { USD: 2490, EUR: 2090, GBP: 1890 },
      854665,
      854666,
    ),
    '15m': price(
      { USD: 349, EUR: 299, GBP: 259 },
      { USD: 3490, EUR: 2990, GBP: 2590 },
      916451,
      916452,
    ),
    '20m': price(
      { USD: 419, EUR: 359, GBP: 319 },
      { USD: 4190, EUR: 3590, GBP: 3190 },
      916453,
      916454,
    ),
    '30m': price(
      { USD: 519, EUR: 449, GBP: 389 },
      { USD: 5190, EUR: 4490, GBP: 3890 },
      925498,
      925499,
    ),
    '40m': price(
      { USD: 619, EUR: 529, GBP: 459 },
      { USD: 6190, EUR: 5290, GBP: 4590 },
      925500,
      925501,
    ),
    '50m': price(
      { USD: 719, EUR: 619, GBP: 539 },
      { USD: 7190, EUR: 6190, GBP: 5390 },
      925503,
      925505,
    ),
  },
  plus: {
    '100k': price(
      { USD: 39, EUR: 35, GBP: 29 },
      { USD: 390, EUR: 350, GBP: 290 },
      925536,
      925537,
    ),
    '200k': price(
      { USD: 59, EUR: 49, GBP: 45 },
      { USD: 590, EUR: 490, GBP: 450 },
      925538,
      925539,
    ),
    '500k': price(
      { USD: 109, EUR: 95, GBP: 79 },
      { USD: 1090, EUR: 950, GBP: 790 },
      925540,
      925541,
    ),
    '1m': price(
      { USD: 179, EUR: 159, GBP: 135 },
      { USD: 1790, EUR: 1590, GBP: 1350 },
      925542,
      925543,
    ),
    '2m': price(
      { USD: 279, EUR: 239, GBP: 209 },
      { USD: 2790, EUR: 2390, GBP: 2090 },
      925544,
      925545,
    ),
    '5m': price(
      { USD: 439, EUR: 379, GBP: 329 },
      { USD: 4390, EUR: 3790, GBP: 3290 },
      925546,
      925547,
    ),
    '10m': price(
      { USD: 629, EUR: 539, GBP: 469 },
      { USD: 6290, EUR: 5390, GBP: 4690 },
      925548,
      925549,
    ),
    '15m': price(
      { USD: 919, EUR: 799, GBP: 699 },
      { USD: 9190, EUR: 7990, GBP: 6990 },
      925550,
      925551,
    ),
    '20m': price(
      { USD: 1139, EUR: 979, GBP: 849 },
      { USD: 11390, EUR: 9790, GBP: 8490 },
      925552,
      925553,
    ),
    '30m': price(
      { USD: 1459, EUR: 1249, GBP: 1079 },
      { USD: 14590, EUR: 12490, GBP: 10790 },
      925554,
      925555,
    ),
    '40m': price(
      { USD: 1799, EUR: 1549, GBP: 1329 },
      { USD: 17990, EUR: 15490, GBP: 13290 },
      925556,
      925557,
    ),
    '50m': price(
      { USD: 2159, EUR: 1859, GBP: 1599 },
      { USD: 21590, EUR: 18590, GBP: 15990 },
      925558,
      925559,
    ),
  },
  enterprise: {},
}

export const PLAN_ENTITLEMENTS = {
  standard: {
    websites: 50,
    teamMembers: 10,
    organisations: 3,
    apiRateLimitPerHour: 600,
    sessionReplaysIncluded: 0,
    featureKeys: [
      'pricing.benefits.eventsAndGoals',
      'pricing.benefits.funnels',
      'pricing.benefits.sessionUserProfileAnalysis',
      'pricing.benefits.errorTracking',
      'pricing.benefits.advancedBotDetection',
      'pricing.benefits.adBlockerBypass',
      'pricing.benefits.emailReports',
      'pricing.benefits.recaptchaAlternative',
      'pricing.benefits.restfulApiSdks',
      'pricing.benefits.googleAnalyticsImport',
      'pricing.benefits.humanSupport',
    ],
  },
  plus: {
    websites: 100,
    teamMembers: 25,
    organisations: 10,
    apiRateLimitPerHour: 5000,
    sessionReplaysIncluded: 'byEventTier',
    sessionReplayQuota: {
      '100k': 5000,
      '200k': 10000,
      '500k': 25000,
      '1m': 50000,
      '2m': 100000,
      '5m': 250000,
      '10m': 500000,
      '15m': 750000,
      '20m': 1000000,
      '30m': 1500000,
      '40m': 2000000,
      '50m': 2500000,
    },
    featureKeys: [
      'pricing.benefits.sessionReplays',
      'pricing.benefits.featureFlags',
      'pricing.benefits.abTesting',
      'pricing.benefits.twentyXHigherApiRateLimits',
      'pricing.benefits.prioritySupport',
    ],
  },
  enterprise: {
    websites: 'custom',
    teamMembers: 'custom',
    organisations: 'custom',
    apiRateLimitPerHour: 'custom',
    sessionReplaysIncluded: 'custom',
    featureKeys: [
      'pricing.benefits.dedicatedAccountManager',
      'pricing.benefits.customEventLimits',
      'pricing.benefits.customFeatures',
      'pricing.benefits.onPremise',
      'pricing.benefits.dedicatedInstance',
      'pricing.benefits.ssoSaml',
      'pricing.benefits.personalOnboarding',
      'pricing.benefits.manualInvoicing',
      'pricing.benefits.sla',
    ],
  },
} as const

export const ADDONS = {
  websiteBundles: [
    {
      code: 'websites_50',
      quantity: 50,
      labelKey: 'pricing.addons.websiteBundle',
      monthly: { USD: 7.5, EUR: 7, GBP: 6 },
    },
    {
      code: 'websites_250',
      quantity: 250,
      labelKey: 'pricing.addons.websiteBundle',
      monthly: { USD: 30, EUR: 27, GBP: 24 },
    },
    {
      code: 'websites_1000',
      quantity: 1000,
      labelKey: 'pricing.addons.websiteBundle',
      monthly: { USD: 99, EUR: 89, GBP: 79 },
    },
  ],
  sessionReplayBundles: [
    {
      code: 'replays_5000',
      quantity: 5000,
      labelKey: 'pricing.addons.sessionReplayBundle',
      monthly: { USD: 19, EUR: 17, GBP: 15 },
    },
    {
      code: 'replays_25000',
      quantity: 25000,
      labelKey: 'pricing.addons.sessionReplayBundle',
      monthly: { USD: 79, EUR: 69, GBP: 59 },
    },
    {
      code: 'replays_100000',
      quantity: 100000,
      labelKey: 'pricing.addons.sessionReplayBundle',
      monthly: { USD: 249, EUR: 209, GBP: 189 },
    },
  ],
} as const

const LEGACY_PLAN_LIMITS = {
  none: {
    index: 0,
    planCode: 'none',
    monthlyUsageLimit: 0,
    legacy: false,
    price: {
      USD: { monthly: 0, yearly: 0 },
      EUR: { monthly: 0, yearly: 0 },
      GBP: { monthly: 0, yearly: 0 },
    },
    maxAlerts: 0,
  },
  free: {
    index: 0,
    planCode: 'free',
    monthlyUsageLimit: 5000,
    legacy: true,
    price: {
      USD: { monthly: 0, yearly: 0 },
      EUR: { monthly: 0, yearly: 0 },
      GBP: { monthly: 0, yearly: 0 },
    },
    maxAlerts: 1,
  },
  trial: {
    index: 0,
    planCode: 'trial',
    monthlyUsageLimit: 10000000,
    legacy: false,
    price: {
      USD: { monthly: 0, yearly: 0 },
      EUR: { monthly: 0, yearly: 0 },
      GBP: { monthly: 0, yearly: 0 },
    },
    maxAlerts: 50,
  },
  hobby: {
    index: 1,
    planCode: 'hobby',
    monthlyUsageLimit: 10000,
    legacy: true,
    price: {
      USD: { monthly: 5, yearly: 50 },
      EUR: { monthly: 5, yearly: 50 },
      GBP: { monthly: 4, yearly: 40 },
    },
    pid: 813694,
    ypid: 813695,
    maxAlerts: 50,
  },
  '50k': {
    index: 1.5,
    planCode: '50k',
    monthlyUsageLimit: 50000,
    legacy: true,
    price: {
      USD: { monthly: 12, yearly: 120 },
      EUR: { monthly: 10, yearly: 100 },
      GBP: { monthly: 10, yearly: 100 },
    },
    pid: 918109,
    ypid: 918110,
    maxAlerts: 50,
  },
  freelancer: {
    index: 2,
    planCode: 'freelancer',
    monthlyUsageLimit: 100000,
    legacy: true,
    price: {
      USD: { monthly: 15, yearly: 150 },
      EUR: { monthly: 15, yearly: 150 },
      GBP: { monthly: 14, yearly: 140 },
    },
    pid: 752316,
    ypid: 776469,
    maxAlerts: 50,
  },
} as const satisfies Partial<Record<PlanCode, PlanLimit>>

const createPlanLimit = (
  eventTierCode: EventTierCode,
  index: number,
): PlanLimit => {
  const tier = EVENT_TIERS[eventTierCode]
  const monthly = PLAN_PRICES.standard[eventTierCode]?.monthly
  const yearly = PLAN_PRICES.standard[eventTierCode]?.yearly
  const monthlyUsd = assertCatalogPrice(
    eventTierCode,
    'monthly',
    'USD',
    monthly?.USD,
  )
  const monthlyEur = assertCatalogPrice(
    eventTierCode,
    'monthly',
    'EUR',
    monthly?.EUR,
  )
  const monthlyGbp = assertCatalogPrice(
    eventTierCode,
    'monthly',
    'GBP',
    monthly?.GBP,
  )
  const yearlyUsd = assertCatalogPrice(
    eventTierCode,
    'yearly',
    'USD',
    yearly?.USD,
  )
  const yearlyEur = assertCatalogPrice(
    eventTierCode,
    'yearly',
    'EUR',
    yearly?.EUR,
  )
  const yearlyGbp = assertCatalogPrice(
    eventTierCode,
    'yearly',
    'GBP',
    yearly?.GBP,
  )

  return {
    index,
    planCode: tier.planCode,
    monthlyUsageLimit: tier.monthlyEvents,
    legacy: false,
    price: {
      USD: {
        monthly: monthlyUsd.amount,
        yearly: yearlyUsd.amount,
      },
      EUR: {
        monthly: monthlyEur.amount,
        yearly: yearlyEur.amount,
      },
      GBP: {
        monthly: monthlyGbp.amount,
        yearly: yearlyGbp.amount,
      },
    },
    ...(monthlyUsd.paddlePlanId ? { pid: monthlyUsd.paddlePlanId } : {}),
    ...(yearlyUsd.paddlePlanId ? { ypid: yearlyUsd.paddlePlanId } : {}),
    maxAlerts: 50,
  }
}

export const PLAN_LIMITS = {
  ...LEGACY_PLAN_LIMITS,
  ...EVENT_TIER_CODES.reduce(
    (limits, tierCode, index) => ({
      ...limits,
      [EVENT_TIERS[tierCode].planCode]: createPlanLimit(tierCode, index + 2.5),
    }),
    {} as Record<PlanCode, PlanLimit>,
  ),
} as Record<PlanCode, PlanLimit>

export const getEffectivePlanType = (
  planType?: string | null,
  _planCode?: string | null,
): PlanTypeCode => {
  if (planType && planType in PLAN_TYPES) {
    return planType as PlanTypeCode
  }

  return 'standard'
}

export const getEventTierByPlanCode = (planCode?: string | null) =>
  EVENT_TIER_CODES.map((code) => ({ code, ...EVENT_TIERS[code] })).find(
    (tier) => tier.planCode === planCode,
  )

export const getPlanPrice = (
  planType: PlanTypeCode,
  eventTier: EventTierCode,
  billingInterval: BillingInterval,
  currencyCode: CurrencyCode,
) =>
  PLAN_PRICES[planType]?.[eventTier]?.[billingInterval]?.[currencyCode] ?? null

export const getPlanMonthlyPrice = (
  planType: PlanTypeCode,
  eventTier: EventTierCode,
  billingInterval: BillingInterval,
  currencyCode: CurrencyCode,
) => {
  const planPrice = getPlanPrice(
    planType,
    eventTier,
    billingInterval,
    currencyCode,
  )

  if (!planPrice) return null
  return billingInterval === 'yearly'
    ? Math.round((planPrice.amount / 12) * 100) / 100
    : planPrice.amount
}

export const getIncludedSessionReplays = (
  planType: PlanTypeCode,
  eventTier: EventTierCode,
) => {
  const entitlements = PLAN_ENTITLEMENTS[planType]

  if (typeof entitlements.sessionReplaysIncluded === 'number') {
    return entitlements.sessionReplaysIncluded
  }

  if (
    entitlements.sessionReplaysIncluded === 'byEventTier' &&
    'sessionReplayQuota' in entitlements
  ) {
    return entitlements.sessionReplayQuota[eventTier] ?? 0
  }

  return entitlements.sessionReplaysIncluded
}
