import { OrganisationMembership } from './Organisation'
import { SharedProject } from './SharedProject'

export enum DashboardBlockReason {
  'exceeding_plan_limits' = 'exceeding_plan_limits',
  'trial_ended' = 'trial_ended',
  'payment_failed' = 'payment_failed',
  'subscription_cancelled' = 'subscription_cancelled',
}

enum PlanCode {
  none = 'none',
  free = 'free',
  trial = 'trial',
  hobby = 'hobby',
  freelancer = 'freelancer',
  '50k' = '50k',
  '100k' = '100k',
  '200k' = '200k',
  '500k' = '500k',
  startup = 'startup',
  '2m' = '2m',
  enterprise = 'enterprise',
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

enum OnboardingStep {
  LANGUAGE = 'language',
  WELCOME = 'welcome',
  FEATURE_TRAFFIC = 'feature_traffic',
  FEATURE_ERRORS = 'feature_errors',
  FEATURE_SESSIONS = 'feature_sessions',
  CREATE_PROJECT = 'create_project',
  SETUP_TRACKING = 'setup_tracking',
  WAITING_FOR_EVENTS = 'waiting_for_events',
  VERIFY_EMAIL = 'verify_email',
  COMPLETED = 'completed',
}

export interface User {
  id: string
  planCode: PlanCode
  planType: PlanType | null
  effectivePlanType: PlanType | null
  addonOverrides: Record<string, unknown> | null
  entitlementOverrides: Record<string, unknown> | null
  nickname: string
  email: string
  isActive: boolean
  trialEndDate: string
  reportFrequency: string
  emailRequests: number
  created: string
  updated: string
  evWarningSentOn: string | null
  subID: string | null
  subUpdateURL: string | null
  subCancelURL: string | null
  timezone: string
  isTwoFactorAuthenticationEnabled: boolean
  trialReminderSent: boolean
  billingFrequency: string | null
  nextBillDate: string | null
  cancellationEffectiveDate: string | null
  apiKey: string | null
  slackWebhookUrl: string | null
  discordWebhookUrl: string | null
  telegramChatId: string | null
  isTelegramChatIdConfirmed: boolean
  timeFormat: '12-hour' | '24-hour'
  sharedProjects: SharedProject[]
  registeredWithGoogle: boolean
  googleId: string | null
  githubId: number | null
  registeredWithGithub: boolean
  maxEventsCount: number
  maxProjects: number
  maxApiKeyRequestsPerHour: number
  sessionReplaysIncluded: number | string
  purchasedWebsiteAddons: number
  tierCurrency: 'USD' | 'EUR' | 'GBP' | null
  showLiveVisitorsInTitle: boolean
  receiveLoginNotifications: boolean
  planExceedContactedAt: Date
  dashboardBlockReason: DashboardBlockReason
  isAccountBillingSuspended: boolean
  organisationMemberships: OrganisationMembership[]
  onboardingStep: OnboardingStep
  hasCompletedOnboarding: boolean
  registeredViaInvitation: boolean
}
