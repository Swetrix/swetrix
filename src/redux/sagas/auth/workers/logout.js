import { call, put } from 'redux-saga/effects'
import Debug from 'debug'

import UIActions from 'redux/actions/ui'
import { getGeneralStats } from 'api'

const debug = Debug('swetrix:rx:s:logout')

export default function* logoutWorker() {
  try {
    const stats = yield call(getGeneralStats)

    yield put(UIActions.setGeneralStats(stats))
  } catch (e) {
    debug('Error while getting general stats data: %s', e)
  }
}
