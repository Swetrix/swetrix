import * as _omit from 'lodash/omit'
import { SELFHOSTED_EMAIL, SELFHOSTED_UUID } from '../../common/constants'
import { getUserClickhouse } from '../../common/utils'

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
  timezone: string
  timeFormat: TimeFormat
  showLiveVisitorsInTitle: boolean
}

export const generateSelfhostedUser = (): SelfhostedUser => ({
  id: SELFHOSTED_UUID,
  email: SELFHOSTED_EMAIL,
  isTwoFactorAuthenticationEnabled: false,
  planCode: 'enterprise',
  roles: [UserType.ADMIN, UserType.CUSTOMER],
  isActive: true,
  timezone: DEFAULT_TIMEZONE,
  timeFormat: TimeFormat['12-hour'],
  showLiveVisitorsInTitle: false,
})

export const getSelfhostedUser = async (): Promise<SelfhostedUser> => {
  const user = generateSelfhostedUser()
  let settings = {}

  try {
    settings = _omit((await getUserClickhouse()) || {}, ['id'])
  } catch (reason) {
    console.error('[ERROR] getSelfhostedUser: ', reason)
  }

  return {
    ...user,
    ...settings,
  }
}
