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
import { Extension } from '../../marketplace/extensions/entities/extension.entity'
import { ExtensionToUser } from '../../marketplace/extensions/entities/extension-to-user.entity'
import { Payout } from '../../payouts/entities/payouts.entity'
import { Comment } from '../../marketplace/comments/entities/comment.entity'
import { CommentReply } from '../../marketplace/comments/entities/comment-reply.entity'
import { Complaint } from '../../marketplace/complaints/entities/complaint.entity'
import { RefreshToken } from './refresh-token.entity'
import { OrganisationMember } from '../../organisation/entity/organisation-member.entity'

export enum PlanCode {
  none = 'none',
  free = 'free',
  trial = 'trial',
  hobby = 'hobby',
  freelancer = 'freelancer',
  '100k' = '100k',
  '200k' = '200k',
  '500k' = '500k',
  startup = 'startup',
  '2m' = '2m',
  enterprise = 'enterprise',
  '10m' = '10m',
  '15m' = '15m',
  '20m' = '20m',
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
  legacy: boolean
  pid?: string
  ypid?: string
}

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
    pid: '813694', // Plan ID
    ypid: '813695', // Plan ID - Yearly billing
    maxAlerts: 50,
  },
  [PlanCode.freelancer]: {
    id: PlanCode.freelancer,
    monthlyUsageLimit: 100000,
    pid: '752316', // Plan ID
    ypid: '776469', // Plan ID - Yearly billing
    maxAlerts: 50,
  },
  [PlanCode['100k']]: {
    id: PlanCode['100k'],
    monthlyUsageLimit: 100000,
    pid: '916455', // Plan ID
    ypid: '916456', // Plan ID - Yearly billing
    maxAlerts: 50,
  },
  [PlanCode['200k']]: {
    id: PlanCode['200k'],
    monthlyUsageLimit: 200000,
    pid: '854654', // Plan ID
    ypid: '854655', // Plan ID - Yearly billing
    maxAlerts: 50,
  },
  [PlanCode['500k']]: {
    id: PlanCode['500k'],
    monthlyUsageLimit: 500000,
    pid: '854656', // Plan ID
    ypid: '854657', // Plan ID - Yearly billing
    maxAlerts: 50,
  },
  [PlanCode.startup]: {
    id: PlanCode.startup,
    monthlyUsageLimit: 1000000,
    pid: '752317',
    ypid: '776470',
    maxAlerts: 50,
  },
  [PlanCode['2m']]: {
    id: PlanCode['2m'],
    monthlyUsageLimit: 2000000,
    pid: '854663', // Plan ID
    ypid: '854664', // Plan ID - Yearly billing
    maxAlerts: 50,
  },
  [PlanCode.enterprise]: {
    id: PlanCode.enterprise,
    monthlyUsageLimit: 5000000,
    pid: '752318',
    ypid: '776471',
    maxAlerts: 50,
  },
  [PlanCode['10m']]: {
    id: PlanCode['10m'],
    monthlyUsageLimit: 10000000,
    pid: '854665', // Plan ID
    ypid: '854666', // Plan ID - Yearly billing
    maxAlerts: 50,
  },
  [PlanCode['15m']]: {
    id: PlanCode['15m'],
    monthlyUsageLimit: 15000000,
    pid: '916451', // Plan ID
    ypid: '916452', // Plan ID - Yearly billing
    maxAlerts: 50,
  },
  [PlanCode['20m']]: {
    id: PlanCode['20m'],
    monthlyUsageLimit: 20000000,
    pid: '916453', // Plan ID
    ypid: '916454', // Plan ID - Yearly billing
    maxAlerts: 50,
  },
}

export const getNextPlan = (planCode: PlanCode): PlanSignature | undefined => {
  const currentLimit = ACCOUNT_PLANS[planCode].monthlyUsageLimit

  let nextPlan

  Object.values(ACCOUNT_PLANS)
    .filter(
      plan => ![PlanCode.free, PlanCode.trial, PlanCode.none].includes(plan.id),
    )
    .some(plan => {
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

export enum TimeFormat {
  '12-hour' = '12-hour',
  '24-hour' = '24-hour',
}

export enum OnboardingStep {
  CREATE_PROJECT = 'create_project',
  SETUP_TRACKING = 'setup_tracking',
  WAITING_FOR_EVENTS = 'waiting_for_events',
  COMPLETED = 'completed',
}

export const MAX_EMAIL_REQUESTS = 4 // 1 confirmation email on sign up + 3 additional ones

export const DEFAULT_TIMEZONE = 'Etc/GMT'

export const TRIAL_DURATION = 14 // days

export enum FeatureFlag {
  'dashboard-period-selector' = 'dashboard-period-selector',
  'dashboard-analytics-tabs' = 'dashboard-analytics-tabs',
  'dashboard-hostname-cards' = 'dashboard-hostname-cards',
}

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({
    type: 'set',
    enum: FeatureFlag,
    default: [],
  })
  featureFlags: FeatureFlag[]

  @Column({
    type: 'enum',
    enum: PlanCode,
    default: PlanCode.trial,
  })
  planCode: PlanCode

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

  @Column('varchar', { length: 30, nullable: true })
  twoFactorRecoveryCode: string

  @Column('int', { default: 50 })
  maxProjects: number

  @Column('int', { default: 600 })
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

  /* Affiliate system related fields */
  @Column('varchar', { length: 8, default: null })
  refCode: string | null

  @Column('varchar', { default: null })
  referrerID: string | null

  @Column('varchar', {
    length: 254,
    unique: true,
    default: null,
    nullable: true,
  })
  paypalPaymentsEmail: string | null

  @BeforeUpdate()
  updateTimestamp() {
    this.updated = new Date()
  }

  /* Relations */

  @OneToMany(() => Project, project => project.admin)
  projects: Project[]

  @OneToMany(() => Payout, payout => payout.user)
  payouts: Payout[]

  @OneToMany(() => ProjectShare, sharedProjects => sharedProjects.user)
  sharedProjects: ProjectShare[]

  @OneToMany(() => ActionToken, actionToken => actionToken.user)
  actionTokens: ActionToken[]

  @OneToMany(() => Extension, extension => extension.owner)
  ownedExtensions: Extension[]

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
    default: OnboardingStep.CREATE_PROJECT,
  })
  onboardingStep: OnboardingStep

  @Column({ default: false })
  hasCompletedOnboarding: boolean

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

  @OneToMany(() => ExtensionToUser, extensionToUser => extensionToUser.user)
  @JoinTable()
  extensions: ExtensionToUser[]

  @OneToMany(() => Comment, comment => comment.user)
  @JoinTable()
  comments: Comment[]

  @OneToMany(() => CommentReply, comment => comment.user)
  @JoinTable()
  commentReplies: CommentReply[]

  @OneToMany(() => Complaint, complaint => complaint.user)
  @JoinTable()
  complaints: Complaint[]

  @OneToMany(() => RefreshToken, refreshToken => refreshToken.user)
  @JoinTable()
  refreshTokens: RefreshToken[]

  @OneToMany(() => OrganisationMember, membership => membership.user)
  organisationMemberships: OrganisationMember[]
}
