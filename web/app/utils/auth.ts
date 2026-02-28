import {
  isSelfhosted,
  LOW_EVENTS_WARNING,
  LS_CAPTCHA_VIEW_PREFS_SETTING,
  SHOW_BANNER_AT_PERC,
} from '~/lib/constants'

import { getCookie } from './cookie'
import { removeItem } from './localstorage'
import routes from './routes'

export const decidePostAuthRedirect = (user: {
  hasCompletedOnboarding: boolean
  planCode?: string
}): string => {
  if (!user.hasCompletedOnboarding) {
    return routes.onboarding
  }

  return routes.dashboard
}

export const shouldShowLowEventsBanner = (
  totalMonthlyEvents: number,
  maxEventsCount: number,
) => {
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

/**
 * Clears local storage items related to user session.
 * Called before navigating to /logout route.
 */
export const clearLocalStorageOnLogout = () => {
  removeItem(LS_CAPTCHA_VIEW_PREFS_SETTING)
}
