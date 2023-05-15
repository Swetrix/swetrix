import { SELFHOSTED_EMAIL, SELFHOSTED_UUID } from '../../common/constants'

export enum UserType {
  CUSTOMER = 'customer',
  ADMIN = 'admin',
}

export enum TimeFormat {
  '12-hour' = '12-hour',
  '24-hour' = '24-hour',
}

export const DEFAULT_TIMEZONE = 'Etc/GMT'

export interface SelfhostedUser {
  id: string
  email: string
  isTwoFactorAuthenticationEnabled: boolean
  planCode: 'enterprise'
  roles: UserType[]
  isActive: boolean
}

export const generateSelfhostedUser = (): SelfhostedUser => ({
  id: SELFHOSTED_UUID,
  email: SELFHOSTED_EMAIL,
  isTwoFactorAuthenticationEnabled: false,
  planCode: 'enterprise',
  roles: [UserType.ADMIN, UserType.CUSTOMER],
  isActive: true,
})
