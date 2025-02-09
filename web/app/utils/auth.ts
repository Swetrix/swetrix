import { logoutAllApi, logoutApi } from '~/api'
import {
  isSelfhosted,
  LOW_EVENTS_WARNING,
  LS_CAPTCHA_VIEW_PREFS_SETTING,
  LS_VIEW_PREFS_SETTING,
  SHOW_BANNER_AT_PERC,
} from '~/lib/constants'

import { removeAccessToken } from './accessToken'
import { getCookie } from './cookie'
import { removeItem } from './localstorage'
import { getRefreshToken, removeRefreshToken } from './refreshToken'

export const shouldShowLowEventsBanner = (totalMonthlyEvents: number, maxEventsCount: number) => {
  if (isSelfhosted) {
    return false
  }

  const lowEvents = getCookie(LOW_EVENTS_WARNING)

  if (lowEvents) {
    return false
  }

  const eventsUsedPercentage = (totalMonthlyEvents * 100) / maxEventsCount

  return eventsUsedPercentage >= SHOW_BANNER_AT_PERC
}

export const logout = async (invalidateAllSessions?: boolean) => {
  const refreshToken = getRefreshToken()

  try {
    if (invalidateAllSessions) {
      await logoutAllApi()
    } else {
      await logoutApi(refreshToken)
    }
  } catch (reason) {
    console.error('Failed to invalidate refresh token', reason)
  }

  removeAccessToken()
  removeItem(LS_VIEW_PREFS_SETTING)
  removeItem(LS_CAPTCHA_VIEW_PREFS_SETTING)
  removeRefreshToken()
}
