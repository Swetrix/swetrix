import { ISharedProject } from './ISharedProject'

export enum DashboardBlockReason {
  'exceeding_plan_limits' = 'exceeding_plan_limits',
  'trial_ended' = 'trial_ended',
  'payment_failed' = 'payment_failed',
  'subscription_cancelled' = 'subscription_cancelled',
}

export interface IUser {
  id: string
  roles: string[]
  planCode: string
  nickname: string
  email: string
  isActive: boolean
  trialEndDate: string
  reportFrequency: string
  emailRequests: number
  created: string
  updated: string
  evWarningSentOn: string | null
  exportedAt: string
  subID: string | null
  subUpdateURL: string | null
  subCancelURL: string | null
  timezone: string
  theme: string | null
  isTwoFactorAuthenticationEnabled: boolean
  trialReminderSent: boolean
  billingFrequency: string | null
  nextBillDate: string | null
  cancellationEffectiveDate: string | null
  apiKey: string | null
  telegramChatId: string | null
  isTelegramChatIdConfirmed: boolean
  timeFormat: string
  sharedProjects: ISharedProject[]
  registeredWithGoogle: boolean
  googleId: string | null
  githubId: number | null
  registeredWithGithub: boolean
  maxEventsCount: number
  tierCurrency: 'USD' | 'EUR' | 'GBP' | null
  showLiveVisitorsInTitle: boolean
  receiveLoginNotifications: boolean
  refCode: string | null
  referrerID: string | null
  paypalPaymentsEmail: string | null
  planExceedContactedAt: Date
  dashboardBlockReason: DashboardBlockReason
  isAccountBillingSuspended: boolean
}
