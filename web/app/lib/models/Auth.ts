import { User } from './User'

export interface Auth {
  refreshToken: string
  accessToken: string
  user: User
  totalMonthlyEvents: number
}

export type SSOProvider = 'google' | 'github'
