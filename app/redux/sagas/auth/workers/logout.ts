import { call, put } from 'redux-saga/effects'
import Debug from 'debug'

import UIActions from 'redux/reducers/ui'
// import { getGeneralStats } from 'api'
import { IStats } from '../../../models/IStats'

const debug = Debug('swetrix:rx:s:logout')

export default function* logoutWorker({ payload: { basedOn401Error } }: { payload: { basedOn401Error: boolean } }) {
  try {
    if (!basedOn401Error) {
      // const stats: IStats = yield call(getGeneralStats)
      // yield put(UIActions.setGeneralStats(stats))
    }
  } catch (e) {
    debug('Error while getting general stats data: %s', e)
  }
}
