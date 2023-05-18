import {
  put, call, delay, select,
} from 'redux-saga/effects'
import Debug from 'debug'

import { getGeneralStats } from 'api'
import UIActions from 'redux/reducers/ui'
import { GENERAL_STATS_UPDATE_INTERVAL, isSelfhosted } from 'redux/constants'
import { IStats } from 'redux/models/IStats'

const debug = Debug('swetrix:rx:s:general-stats')

const NOT_AUTHED_INTERVAL = 5000 // 5 seconds

export default function* generalStats() {
  if (isSelfhosted) {
    return
  }

  while (true) {
    const isAuthenticated: boolean = yield select(state => state.auth.authenticated)
    if (isAuthenticated) {
      yield delay(NOT_AUTHED_INTERVAL)
      continue
    }

    try {
      const stats: IStats = yield call(getGeneralStats)

      yield put(UIActions.setGeneralStats(stats))
    } catch (e) {
      debug('Error while getting general stats data: %s', e)
    }

    yield delay(GENERAL_STATS_UPDATE_INTERVAL)
  }
}
