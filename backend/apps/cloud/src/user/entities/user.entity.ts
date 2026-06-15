import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  BeforeUpdate,
  JoinTable,
} from 'typeorm'
import { ActionToken } from '../../action-tokens/action-token.entity'
import { Project } from '../../project/entity/project.entity'
import { ProjectShare } from '../../project/entity/project-share.entity'
import { RefreshToken } from './refresh-token.entity'
import { OrganisationMember } from '../../organisation/entity/organisation-member.entity'

export enum PlanCode {
  none = 'none',
  free = 'free',
  trial = 'trial',
  hobby = 'hobby',
  freelancer = 'freelancer',
  '50k' = '50k',
  '100k' = '100k',
  '200k' = '200k',
  '500k' = '500k',
  '1m' = '1m',
  '2m' = '2m',
  '5m' = '5m',
  '10m' = '10m',
  '15m' = '15m',
  '20m' = '20m',
  '30m' = '30m',
  '40m' = '40m',
  '50m' = '50m',
}

export enum PlanType {
  standard = 'standard',
  plus = 'plus',
  enterprise = 'enterprise',
}

export enum PlanFeatureCode {
  featureFlags = 'featureFlags',
  experiments = 'experiments',
  replays = 'replays',
}

export enum DashboardBlockReason {
  'exceeding_plan_limits' = 'exceeding_plan_limits',
  'trial_ended' = 'trial_ended',
  'payment_failed' = 'payment_failed',
  'subscription_cancelled' = 'subscription_cancelled',
}

interface PlanSignature {
  id: PlanCode
  monthlyUsageLimit: number
  maxAlerts: number
  legacy?: boolean
  pid?: string | null
  ypid?: string | null
}

const DEFAULT_MAX_PROJECTS = 10
const DEFAULT_API_KEY_REQUESTS_PER_HOUR = 300
type AccountLimitValue = number | 'custom'

const PLAN_TYPE_ENTITLEMENTS = {
  [PlanType.standard]: {
    websites: 10,
    teamMembers: 10,
    organisations: 3,
    apiRateLimitPerHour: 300,
    sessionReplaysIncluded: 0,
  },
  [PlanType.plus]: {
    websites: 100,
    teamMembers: 25,
    organisations: 10,
    apiRateLimitPerHour: 6000,
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

const PLUS_SESSION_REPLAY_QUOTA: Partial<Record<PlanCode, number>> = {
  [PlanCode.freelancer]: 5000,
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

const PLAN_TYPE_RANK = {
  [PlanType.standard]: 1,
  [PlanType.plus]: 2,
  [PlanType.enterprise]: 3,
} as const

const PLAN_FEATURE_REQUIRED_PLAN = {
  [PlanFeatureCode.featureFlags]: PlanType.plus,
  [PlanFeatureCode.experiments]: PlanType.plus,
  [PlanFeatureCode.replays]: PlanType.plus,
} as const

interface PaddleProductIds {
  pid: string
  ypid: string
}

const PLAN_TYPE_PADDLE_PRODUCTS: Partial<
  Record<PlanType, Partial<Record<PlanCode, PaddleProductIds>>>
> = {
  [PlanType.plus]: {
    [PlanCode['100k']]: { pid: '925536', ypid: '925537' },
    [PlanCode['200k']]: { pid: '925538', ypid: '925539' },
    [PlanCode['500k']]: { pid: '925540', ypid: '925541' },
    [PlanCode['1m']]: { pid: '925542', ypid: '925543' },
    [PlanCode['2m']]: { pid: '925544', ypid: '925545' },
    [PlanCode['5m']]: { pid: '925546', ypid: '925547' },
    [PlanCode['10m']]: { pid: '925548', ypid: '925549' },
    [PlanCode['15m']]: { pid: '925550', ypid: '925551' },
    [PlanCode['20m']]: { pid: '925552', ypid: '925553' },
    [PlanCode['30m']]: { pid: '925554', ypid: '925555' },
    [PlanCode['40m']]: { pid: '925556', ypid: '925557' },
    [PlanCode['50m']]: { pid: '925558', ypid: '925559' },
  },
}

export const getEffectivePlanType = (
  user?: {
    planCode?: PlanCode | null
    planType?: PlanType | null
  } | null,
): PlanType | null => {
  if (!user) {
    return null
  }

  if (
    !user.planCode ||
    [PlanCode.none, PlanCode.free, PlanCode.trial].includes(user.planCode)
  ) {
    return null
  }

  if (user.planType) {
    return user.planType
  }

  return PlanType.standard
}

const getPlanTypeEntitlements = (planType?: PlanType | null) =>
  PLAN_TYPE_ENTITLEMENTS[planType || PlanType.standard]

const getNumericLimitOverride = (
  overrides: Record<string, unknown> | null | undefined,
  key: string,
) => {
  const value = overrides?.[key]

  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

const getNumericAccountLimit = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

export const getPurchasedWebsiteAddons = (
  user?: {
    addonOverrides?: Record<string, unknown> | null
  } | null,
): number =>
  Math.max(
    0,
    getNumericLimitOverride(user?.addonOverrides, 'websites') ??
      getNumericLimitOverride(user?.addonOverrides, 'additionalWebsites') ??
      0,
  )

export const getPurchasedSessionReplayAddons = (
  user?: {
    addonOverrides?: Record<string, unknown> | null
  } | null,
): number =>
  Math.max(
    0,
    getNumericLimitOverride(user?.addonOverrides, 'sessionReplays') ?? 0,
  )

export const getDefaultAccountLimitUpdates = () => ({
  maxProjects: DEFAULT_MAX_PROJECTS,
  maxApiKeyRequestsPerHour: DEFAULT_API_KEY_REQUESTS_PER_HOUR,
})

export const getSessionReplayQuota = (
  user?: {
    planCode?: PlanCode | null
    planType?: PlanType | null
    entitlementOverrides?: Record<string, unknown> | null
    addonOverrides?: Record<string, unknown> | null
  } | null,
): number | 'custom' => {
  const replayOverride = getNumericLimitOverride(
    user?.entitlementOverrides,
    'sessionReplaysIncluded',
  )
  const replayAddons = getPurchasedSessionReplayAddons(user)

  if (typeof replayOverride === 'number') {
    return replayOverride + replayAddons
  }

  const effectivePlanType = getEffectivePlanType(user)
  const entitlements = getPlanTypeEntitlements(effectivePlanType)

  if (entitlements.sessionReplaysIncluded === 'custom') {
    return 'custom'
  }

  if (entitlements.sessionReplaysIncluded === 'byEventTier') {
    return (
      (PLUS_SESSION_REPLAY_QUOTA[user?.planCode || PlanCode.none] || 0) +
      replayAddons
    )
  }

  return entitlements.sessionReplaysIncluded + replayAddons
}

export const getSessionReplayRetentionEntitlement = (
  user?: {
    planCode?: PlanCode | null
    planType?: PlanType | null
    entitlementOverrides?: Record<string, unknown> | null
  } | null,
): number => {
  const override = getNumericLimitOverride(
    user?.entitlementOverrides,
    'sessionReplayRetentionDays',
  )

  if (typeof override === 'number') {
    return override
  }

  if (user?.planType === PlanType.enterprise) {
    return 1825
  }

  return getEffectivePlanType(user) === PlanType.enterprise ? 1825 : 30
}

export const getEffectiveAccountLimits = (
  user?: {
    planCode?: PlanCode | null
    planType?: PlanType | null
    entitlementOverrides?: Record<string, unknown> | null
    addonOverrides?: Record<string, unknown> | null
    maxProjects?: number | null
    maxApiKeyRequestsPerHour?: number | null
  } | null,
) => {
  const effectivePlanType = getEffectivePlanType(user)
  const entitlements = getPlanTypeEntitlements(effectivePlanType)
  const purchasedWebsiteAddons = getPurchasedWebsiteAddons(user)
  const purchasedSessionReplayAddons = getPurchasedSessionReplayAddons(user)
  const websiteOverride = getNumericLimitOverride(
    user?.entitlementOverrides,
    'websites',
  )
  const apiRateLimitOverride = getNumericLimitOverride(
    user?.entitlementOverrides,
    'apiRateLimitPerHour',
  )
  const teamMembersOverride = getNumericLimitOverride(
    user?.entitlementOverrides,
    'teamMembers',
  )
  const organisationsOverride = getNumericLimitOverride(
    user?.entitlementOverrides,
    'organisations',
  )
  const includedWebsites =
    websiteOverride ??
    (typeof entitlements.websites === 'number'
      ? entitlements.websites
      : (getNumericAccountLimit(user?.maxProjects) ?? DEFAULT_MAX_PROJECTS))
  const apiRateLimitPerHour =
    apiRateLimitOverride ??
    (typeof entitlements.apiRateLimitPerHour === 'number'
      ? entitlements.apiRateLimitPerHour
      : (getNumericAccountLimit(user?.maxApiKeyRequestsPerHour) ??
        DEFAULT_API_KEY_REQUESTS_PER_HOUR))
  const teamMembers =
    teamMembersOverride ??
    (typeof entitlements.teamMembers === 'number'
      ? entitlements.teamMembers
      : 'custom')
  const organisations =
    organisationsOverride ??
    (typeof entitlements.organisations === 'number'
      ? entitlements.organisations
      : 'custom')
  const sessionReplaysIncluded = getSessionReplayQuota(user)
  const includedSessionReplays =
    sessionReplaysIncluded === 'custom'
      ? sessionReplaysIncluded
      : Math.max(0, sessionReplaysIncluded - purchasedSessionReplayAddons)
  const sessionReplayRetentionDays = getSessionReplayRetentionEntitlement(user)
  const effectiveProjectLimit = includedWebsites + purchasedWebsiteAddons

  return {
    effectivePlanType,
    includedWebsites,
    purchasedWebsiteAddons,
    effectiveProjectLimit,
    maxProjects: effectiveProjectLimit,
    apiRateLimitPerHour,
    maxApiKeyRequestsPerHour: apiRateLimitPerHour,
    includedSessionReplays,
    sessionReplaysIncluded,
    purchasedSessionReplayAddons,
    sessionReplayRetentionDays,
    teamMembers: teamMembers as AccountLimitValue,
    organisations: organisations as AccountLimitValue,
  }
}

const planTypeHasFeature = (
  planType: PlanType | null | undefined,
  feature: PlanFeatureCode,
) => {
  if (!planType) {
    return false
  }

  return (
    PLAN_TYPE_RANK[planType] >=
    PLAN_TYPE_RANK[PLAN_FEATURE_REQUIRED_PLAN[feature]]
  )
}

export const userHasPlanFeature = (
  user:
    | {
        planCode?: PlanCode | null
        planType?: PlanType | null
      }
    | null
    | undefined,
  feature: PlanFeatureCode,
) => planTypeHasFeature(getEffectivePlanType(user), feature)

export const ACCOUNT_PLANS = {
  [PlanCode.none]: {
    id: PlanCode.none,
    monthlyUsageLimit: 0,
    maxAlerts: 0,
    pid: null,
    ypid: null,
  },
  [PlanCode.free]: {
    id: PlanCode.free,
    monthlyUsageLimit: 5000,
    maxAlerts: 1,
    pid: null,
    ypid: null,
  },
  [PlanCode.trial]: {
    id: PlanCode.trial,
    monthlyUsageLimit: 10000000,
    maxAlerts: 50,
    pid: null,
    ypid: null,
  },
  [PlanCode.hobby]: {
    id: PlanCode.hobby,
    monthlyUsageLimit: 10000,
    pid: '813694',
    ypid: '813695',
    maxAlerts: 50,
  },
  [PlanCode['50k']]: {
    id: PlanCode['50k'],
    monthlyUsageLimit: 50000,
    pid: '918109',
    ypid: '918110',
    maxAlerts: 50,
  },
  [PlanCode.freelancer]: {
    id: PlanCode.freelancer,
    monthlyUsageLimit: 100000,
    pid: '752316',
    ypid: '776469',
    maxAlerts: 50,
  },
  [PlanCode['100k']]: {
    id: PlanCode['100k'],
    monthlyUsageLimit: 100000,
    pid: '916455',
    ypid: '916456',
    maxAlerts: 50,
  },
  [PlanCode['200k']]: {
    id: PlanCode['200k'],
    monthlyUsageLimit: 200000,
    pid: '854654',
    ypid: '854655',
    maxAlerts: 50,
  },
  [PlanCode['500k']]: {
    id: PlanCode['500k'],
    monthlyUsageLimit: 500000,
    pid: '854656',
    ypid: '854657',
    maxAlerts: 50,
  },
  [PlanCode['1m']]: {
    id: PlanCode['1m'],
    monthlyUsageLimit: 1000000,
    pid: '752317',
    ypid: '776470',
    maxAlerts: 50,
  },
  [PlanCode['2m']]: {
    id: PlanCode['2m'],
    monthlyUsageLimit: 2000000,
    pid: '854663',
    ypid: '854664',
    maxAlerts: 50,
  },
  [PlanCode['5m']]: {
    id: PlanCode['5m'],
    monthlyUsageLimit: 5000000,
    pid: '752318',
    ypid: '776471',
    maxAlerts: 50,
  },
  [PlanCode['10m']]: {
    id: PlanCode['10m'],
    monthlyUsageLimit: 10000000,
    pid: '854665',
    ypid: '854666',
    maxAlerts: 50,
  },
  [PlanCode['15m']]: {
    id: PlanCode['15m'],
    monthlyUsageLimit: 15000000,
    pid: '916451',
    ypid: '916452',
    maxAlerts: 50,
  },
  [PlanCode['20m']]: {
    id: PlanCode['20m'],
    monthlyUsageLimit: 20000000,
    pid: '916453',
    ypid: '916454',
    maxAlerts: 50,
  },
  [PlanCode['30m']]: {
    id: PlanCode['30m'],
    monthlyUsageLimit: 30000000,
    pid: '925498',
    ypid: '925499',
    maxAlerts: 50,
  },
  [PlanCode['40m']]: {
    id: PlanCode['40m'],
    monthlyUsageLimit: 40000000,
    pid: '925500',
    ypid: '925501',
    maxAlerts: 50,
  },
  [PlanCode['50m']]: {
    id: PlanCode['50m'],
    monthlyUsageLimit: 50000000,
    pid: '925503',
    ypid: '925505',
    maxAlerts: 50,
  },
} satisfies Record<PlanCode, PlanSignature>

export const getNextPlan = (planCode: PlanCode): PlanSignature | undefined => {
  const currentLimit = ACCOUNT_PLANS[planCode].monthlyUsageLimit

  let nextPlan

  Object.values(ACCOUNT_PLANS)
    .filter(
      (plan) =>
        ![PlanCode.free, PlanCode.trial, PlanCode.none].includes(plan.id),
    )
    .some((plan) => {
      if (plan.monthlyUsageLimit > currentLimit) {
        nextPlan = plan
        return true
      }

      return false
    })

  return nextPlan
}

export const isNextPlan = (
  currentPlanCode: PlanCode,
  potentialNextPlanCode: PlanCode,
): boolean => {
  const currentPlanLimit = ACCOUNT_PLANS[currentPlanCode].monthlyUsageLimit
  const nextPlanLimit = ACCOUNT_PLANS[potentialNextPlanCode].monthlyUsageLimit

  return nextPlanLimit > currentPlanLimit
}

export enum ReportFrequency {
  Never = 'never',
  Weekly = 'weekly',
  Monthly = 'monthly',
  Quarterly = 'quarterly',
}

export enum BillingFrequency {
  Monthly = 'monthly',
  Yearly = 'yearly',
}

export const getAccountPlanByPaddleProductId = (
  productId?: string | number | null,
) => {
  if (!productId) {
    return null
  }

  const stringifiedProductId = String(productId)

  for (const plan of Object.values(ACCOUNT_PLANS)) {
    if (plan.pid === stringifiedProductId) {
      return {
        plan,
        planType: PlanType.standard,
        billingFrequency: BillingFrequency.Monthly,
      }
    }

    if (plan.ypid === stringifiedProductId) {
      return {
        plan,
        planType: PlanType.standard,
        billingFrequency: BillingFrequency.Yearly,
      }
    }

    for (const [planType, productsByPlanCode] of Object.entries(
      PLAN_TYPE_PADDLE_PRODUCTS,
    )) {
      const products = productsByPlanCode?.[plan.id]

      if (products?.pid === stringifiedProductId) {
        return {
          plan,
          planType: planType as PlanType,
          billingFrequency: BillingFrequency.Monthly,
        }
      }

      if (products?.ypid === stringifiedProductId) {
        return {
          plan,
          planType: planType as PlanType,
          billingFrequency: BillingFrequency.Yearly,
        }
      }
    }
  }

  return null
}

export enum TimeFormat {
  '12-hour' = '12-hour',
  '24-hour' = '24-hour',
}

export enum OnboardingStep {
  LANGUAGE = 'language',
  WELCOME = 'welcome',
  FEATURE_TRAFFIC = 'feature_traffic',
  FEATURE_ERRORS = 'feature_errors',
  FEATURE_SESSIONS = 'feature_sessions',
  SELECT_PLAN = 'select_plan',
  CREATE_PROJECT = 'create_project',
  SETUP_TRACKING = 'setup_tracking',
  WAITING_FOR_EVENTS = 'waiting_for_events',
  VERIFY_EMAIL = 'verify_email',
  COMPLETED = 'completed',
}

export const MAX_EMAIL_REQUESTS = 4 // 1 confirmation email on sign up + 3 additional ones

export const DEFAULT_TIMEZONE = 'Etc/GMT'

export const TRIAL_DURATION = 14 // days

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({
    type: 'enum',
    enum: PlanCode,
    default: PlanCode.none,
  })
  planCode: PlanCode

  @Column({
    type: 'enum',
    enum: PlanType,
    nullable: true,
    default: null,
  })
  planType: PlanType | null

  @Column({ type: 'json', nullable: true })
  addonOverrides: Record<string, unknown> | null

  @Column({ type: 'json', nullable: true })
  entitlementOverrides: Record<string, unknown> | null

  @Column('varchar', { length: 100, nullable: true, default: null })
  nickname: string | null

  @Column('varchar', { length: 254, unique: true })
  email: string

  @Column('varchar', { length: 60, default: '' })
  password: string

  @Column({ default: false })
  isActive: boolean

  @Column({ type: 'timestamp', nullable: true })
  trialEndDate: Date | null

  @Column({
    type: 'enum',
    enum: ReportFrequency,
    default: ReportFrequency.Monthly,
  })
  reportFrequency: ReportFrequency

  @Column('int', { default: 1 })
  emailRequests: number

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created: Date

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated: Date

  // the date when the 'you are running out of events' warning email was last sent on
  @Column({ type: 'timestamp', nullable: true })
  evWarningSentOn: Date

  // the date when the "no events after signup" reminder email was sent
  @Column({ type: 'timestamp', nullable: true })
  noEventsReminderSentOn: Date

  // the date when the "you haven't subscribed yet" reminder email was sent
  @Column({ type: 'timestamp', nullable: true })
  subscribeReminderSentOn: Date

  @Column('varchar', { length: 15, nullable: true })
  subID: string

  @Column('varchar', { length: 200, nullable: true })
  subUpdateURL: string

  @Column('varchar', { length: 200, nullable: true })
  subCancelURL: string

  @Column('varchar', { length: 50, default: DEFAULT_TIMEZONE })
  timezone: string

  @Column('varchar', { length: 32, nullable: true })
  twoFactorAuthenticationSecret: string

  @Column('varchar', { length: 60, nullable: true })
  twoFactorRecoveryCode: string

  @Column('int', { default: DEFAULT_MAX_PROJECTS })
  maxProjects: number

  @Column('int', { default: DEFAULT_API_KEY_REQUESTS_PER_HOUR })
  maxApiKeyRequestsPerHour: number

  @Column({ default: false })
  isTwoFactorAuthenticationEnabled: boolean

  @Column({ default: false })
  trialReminderSent: boolean

  @Column({ default: false })
  showLiveVisitorsInTitle: boolean

  /* Plan usage related fields */
  // the date when user was last contacted about exceeding the plan limits for X consecutive months
  @Column({ type: 'timestamp', nullable: true })
  planExceedContactedAt: Date

  // dashboard block reason
  @Column({
    type: 'enum',
    enum: DashboardBlockReason,
    nullable: true,
  })
  dashboardBlockReason: DashboardBlockReason

  // if we should stop counting user events
  @Column({ default: false })
  isAccountBillingSuspended: boolean

  @BeforeUpdate()
  updateTimestamp() {
    this.updated = new Date()
  }

  /* Relations */

  @OneToMany(() => Project, (project) => project.admin)
  projects: Project[]

  @OneToMany(() => ProjectShare, (sharedProjects) => sharedProjects.user)
  sharedProjects: ProjectShare[]

  @OneToMany(() => ActionToken, (actionToken) => actionToken.user)
  actionTokens: ActionToken[]

  @Column({
    type: 'enum',
    enum: BillingFrequency,
    nullable: true,
  })
  billingFrequency: BillingFrequency

  @Column({ type: 'date', nullable: true })
  nextBillDate: Date | null

  @Column({ type: 'date', nullable: true })
  cancellationEffectiveDate: Date | null

  @Column('varchar', { length: 3, nullable: true })
  tierCurrency: string

  @Column({
    type: 'varchar',
    length: 36,
    unique: true,
    nullable: true,
    default: null,
  })
  apiKey: string | null

  @Column('varchar', { default: null })
  slackWebhookUrl: string | null

  @Column('varchar', { default: null })
  discordWebhookUrl: string | null

  @Column({
    type: 'varchar',
    unique: true,
    nullable: true,
    default: null,
  })
  telegramChatId: string | null

  @Column({
    type: 'boolean',
    default: false,
  })
  isTelegramChatIdConfirmed: boolean

  @Column({
    type: 'boolean',
    default: true,
  })
  receiveLoginNotifications: boolean

  @Column({
    type: 'enum',
    enum: TimeFormat,
    default: TimeFormat['12-hour'],
  })
  timeFormat: TimeFormat

  @Column({
    type: 'enum',
    enum: OnboardingStep,
    default: OnboardingStep.LANGUAGE,
  })
  onboardingStep: OnboardingStep

  @Column({ default: false })
  hasCompletedOnboarding: boolean

  @Column({ default: false })
  registeredViaInvitation: boolean

  // Google SSO
  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    default: null,
  })
  // Google 'sub' value -> https://cloud.google.com/nodejs/docs/reference/google-auth-library/latest/google-auth-library/tokeninfo#google_auth_library_TokenInfo_sub_member
  googleId: string | null

  @Column({ default: false })
  registeredWithGoogle: boolean

  // Github SSO
  @Column({
    type: 'int',
    nullable: true,
    default: null,
  })
  // Github user: id value -> https://developer.github.com/v3/users/#get-the-authenticated-user
  githubId: number | null

  @Column({ default: false })
  registeredWithGithub: boolean

  @OneToMany(() => RefreshToken, (refreshToken) => refreshToken.user)
  @JoinTable()
  refreshTokens: RefreshToken[]

  @OneToMany(() => OrganisationMember, (membership) => membership.user)
  organisationMemberships: OrganisationMember[]
}
