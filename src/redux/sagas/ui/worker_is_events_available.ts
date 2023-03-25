import { put, delay, select } from 'redux-saga/effects'
import _isNull from 'lodash/isNull'

import UIActions from 'redux/reducers/ui'
import { SHOW_BANNER_AT_PERC, LOW_EVENTS_WARNING } from 'redux/constants'
import { getCookie } from 'utils/cookie'

const NOT_AUTHED_INTERVAL = 1000 // 1 second
const NO_DATA_YET = 1000 // 1 second
const DATA_REQUEST_ATTEMPTS = 20

export default function* checkEventsAvailable() {
  const lowEvents = getCookie(LOW_EVENTS_WARNING)

  if (lowEvents) {
    return
  }

  let dataRequests = 0

  while (true) {
    if (dataRequests > DATA_REQUEST_ATTEMPTS) {
      return
    }

    const isAuthenticated: boolean = yield select(state => state.auth.authenticated)

    if (!isAuthenticated) {
      yield delay(NOT_AUTHED_INTERVAL)
      continue
    }

    const totalMonthlyEvents: number | null = yield select(state => state.ui.projects.totalMonthlyEvents)

    if (_isNull(totalMonthlyEvents)) {
      dataRequests++
      yield delay(NO_DATA_YET)
      continue
    }

    const maxEventsCount: number = yield select(state => state.auth.user.maxEventsCount)

    const eventsUsedPercentage = (totalMonthlyEvents * 100) / maxEventsCount

    if (eventsUsedPercentage >= SHOW_BANNER_AT_PERC) {
      yield put(UIActions.setShowNoEventsLeftBanner(true))
    }

    return
  }
}
