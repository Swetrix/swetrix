import { User } from './User'

export interface Auth {
  refreshToken: string
  accessToken: string
  user: User
  totalMonthlyEvents: number
}

export type SSOProvider = 'google' | 'github' | 'openid-connect'

export interface SSOHashSuccessResponse {
  accessToken: string
  refreshToken: string
  user: User
  totalMonthlyEvents: number
}

interface SSOHashLinkingRequiredResponse {
  linkingRequired: true
  email: string
  provider: SSOProvider
  ssoId: string | number
  isTwoFactorAuthenticationEnabled: boolean
}

export type SSOHashResponse =
  | SSOHashSuccessResponse
  | SSOHashLinkingRequiredResponse
