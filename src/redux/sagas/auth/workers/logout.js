import { call, put } from 'redux-saga/effects'
import Debug from 'debug'

import UIActions from 'redux/actions/ui'
import { getGeneralStats } from 'api'
import { THEME_TYPE } from 'redux/constants'

const debug = Debug('swetrix:rx:s:logout')

export default function* logoutWorker({ payload: { basedOn401Error } = {} }) {
  try {
    if (!basedOn401Error) {
      const stats = yield call(getGeneralStats)
      yield put(UIActions.setGeneralStats(stats))
    }

    yield put(UIActions.setThemeType(THEME_TYPE.classic))
  } catch (e) {
    debug('Error while getting general stats data: %s', e)
  }
}
