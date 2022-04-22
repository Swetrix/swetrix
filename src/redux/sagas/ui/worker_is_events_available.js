import { put, delay, select } from 'redux-saga/effects'
import _isNull from 'lodash/isNull'

import UIActions from 'redux/actions/ui'

const NOT_AUTHED_INTERVAL = 1000 // 1 second
const NO_DATA_YET = 1000 // 1 second
const SHOW_BANNER_AT_PERC = 85 // show banner when 85% of events in tier are used

export default function* checkEventsAvailable() {
  while (true) {
    // todo: check banner cookie

    const isAuthenticated = yield select(state => state.auth.authenticated)

    if (!isAuthenticated) {
      yield delay(NOT_AUTHED_INTERVAL)
      continue
    }

    const totalMonthlyEvents = yield select(state => state.ui.projects.totalMonthlyEvents)

    if (_isNull(totalMonthlyEvents)) {
      yield delay(NO_DATA_YET)
      continue
    }

    const maxEventsCount = 5000 // yield select(state => state.auth.user.maxEventsCount)

    const eventsUsedPercentage = totalMonthlyEvents * 100 / maxEventsCount

    console.log(totalMonthlyEvents, maxEventsCount, eventsUsedPercentage)

    if (eventsUsedPercentage >= SHOW_BANNER_AT_PERC) {
      yield put(UIActions.setShowNoEventsLeftBanner(true))
    }

    return
  }
}
