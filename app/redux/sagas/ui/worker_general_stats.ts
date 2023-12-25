import { put, call, delay } from 'redux-saga/effects'
import Debug from 'debug'

import UIActions from 'redux/reducers/ui'
import { isSelfhosted } from 'redux/constants'
import { IStats } from 'redux/models/IStats'
const { getGeneralStats } = require('api')

const debug = Debug('swetrix:rx:s:general-stats')

const RETRY_INTERVAL = 10000 // 10 seconds

export default function* generalStats() {
  if (isSelfhosted) {
    return
  }

  while (true) {
    try {
      const stats: IStats = yield call(getGeneralStats)

      yield put(UIActions.setGeneralStats(stats))
      return
    } catch (e) {
      debug('Error while getting general stats data: %s', e)
    }

    yield delay(RETRY_INTERVAL)
  }
}
