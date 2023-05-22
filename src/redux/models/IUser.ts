import { ISharedProject } from './ISharedProject'

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
  tierCurrency: 'USD' | 'EUR' | 'GBP' | null
}
