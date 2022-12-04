import { call, put } from 'redux-saga/effects'
import Debug from 'debug'

import UIActions from 'redux/actions/ui'
import { getGeneralStats } from 'api'
import { THEME_TYPE } from 'redux/constants'

const debug = Debug('swetrix:rx:s:logout')

export default function* logoutWorker() {
  try {
    const stats = yield call(getGeneralStats)

    yield put(UIActions.setThemeType(THEME_TYPE.christmas))
    yield put(UIActions.setGeneralStats(stats))
  } catch (e) {
    debug('Error while getting general stats data: %s', e)
  }
}
