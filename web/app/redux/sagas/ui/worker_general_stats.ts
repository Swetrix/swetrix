import { put, call, delay } from 'redux-saga/effects'

import UIActions from 'redux/reducers/ui'
import { isSelfhosted } from 'redux/constants'
import { IStats } from 'redux/models/IStats'
const { getGeneralStats } = require('api')

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
    } catch (reason) {
      console.error('Error while getting general stats data:', reason)
    }

    yield delay(RETRY_INTERVAL)
  }
}
