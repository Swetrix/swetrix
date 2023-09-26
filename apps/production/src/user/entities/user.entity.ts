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
import { Complaint } from '../../marketplace/complaints/entities/complaint.entity'
import { RefreshToken } from './refresh-token.entity'

export enum PlanCode {
  none = 'none',
  free = 'free',
  trial = 'trial',
  hobby = 'hobby',
  freelancer = 'freelancer',
  startup = 'startup',
  enterprise = 'enterprise',
}

export const ACCOUNT_PLANS = {
  [PlanCode.none]: {
    id: PlanCode.none,
    displayName: 'No plan',
    monthlyUsageLimit: 0,
    maxProjects: 0,
    maxAlerts: 0,
    maxApiKeyRequestsPerHour: 0,
    legacy: false,
  },
  [PlanCode.free]: {
    id: PlanCode.free,
    displayName: 'Free plan',
    monthlyUsageLimit: 5000,
    maxProjects: 10,
    maxAlerts: 1,
    maxApiKeyRequestsPerHour: 600,
    legacy: true,
  },
  [PlanCode.trial]: {
    id: PlanCode.trial,
    displayName: 'Free trial',
    monthlyUsageLimit: 100000,
    maxProjects: 20,
    maxAlerts: 20,
    maxApiKeyRequestsPerHour: 600,
    legacy: false,
  },
  [PlanCode.hobby]: {
    id: PlanCode.hobby,
    displayName: 'Hobby plan',
    monthlyUsageLimit: 10000,
    maxProjects: 20,
    pid: '813694', // Plan ID
    ypid: '813695', // Plan ID - Yearly billing
    maxAlerts: 10,
    maxApiKeyRequestsPerHour: 600,
    legacy: false,
  },
  [PlanCode.freelancer]: {
    id: PlanCode.freelancer,
    displayName: 'Freelancer plan',
    monthlyUsageLimit: 100000,
    maxProjects: 20,
    pid: '752316', // Plan ID
    ypid: '776469', // Plan ID - Yearly billing
    maxAlerts: 20,
    maxApiKeyRequestsPerHour: 600,
    legacy: false,
  },
  [PlanCode.startup]: {
    id: PlanCode.startup,
    displayName: 'Startup plan',
    monthlyUsageLimit: 1000000,
    maxProjects: 30,
    pid: '752317',
    ypid: '776470',
    maxAlerts: 50,
    maxApiKeyRequestsPerHour: 600,
    legacy: false,
  },
  [PlanCode.enterprise]: {
    id: PlanCode.enterprise,
    displayName: 'Enterprise plan',
    monthlyUsageLimit: 5000000,
    maxProjects: 50,
    pid: '752318',
    ypid: '776471',
    maxAlerts: 100,
    maxApiKeyRequestsPerHour: 600,
    legacy: false,
  },
}

export enum UserType {
  CUSTOMER = 'customer',
  ADMIN = 'admin',
}

enum ReportFrequency {
  Never = 'never',
  Weekly = 'weekly',
  Monthly = 'monthly',
  Quarterly = 'quarterly',
}

export enum BillingFrequency {
  Monthly = 'monthly',
  Yearly = 'yearly',
}

export enum Theme {
  classic = 'classic',
  christmas = 'christmas',
}

export enum TimeFormat {
  '12-hour' = '12-hour',
  '24-hour' = '24-hour',
}

export const MAX_EMAIL_REQUESTS = 4 // 1 confirmation email on sign up + 3 additional ones

export const DEFAULT_TIMEZONE = 'Etc/GMT'

export const TRIAL_DURATION = 14 // days

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({
    type: 'set',
    enum: UserType,
    default: UserType.CUSTOMER,
  })
  roles: UserType[]

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

  @Column({ type: 'timestamp', nullable: true })
  exportedAt: Date

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

  @Column('varchar', { length: 50, default: Theme.classic })
  theme: Theme

  @Column({ default: false })
  isTwoFactorAuthenticationEnabled: boolean

  @Column({ default: false })
  trialReminderSent: boolean

  @Column({ default: false })
  showLiveVisitorsInTitle: boolean

  @Column('varchar', { default: null })
  referrerID: string | null

  @Column('varchar', { length: 254, unique: true })
  paypalPaymentsEmail: string

  @BeforeUpdate()
  updateTimestamp() {
    this.updated = new Date()
  }

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

  @OneToMany(() => Complaint, complaint => complaint.user)
  @JoinTable()
  complaints: Complaint[]

  @OneToMany(() => RefreshToken, refreshToken => refreshToken.user)
  @JoinTable()
  refreshTokens: RefreshToken[]
}
