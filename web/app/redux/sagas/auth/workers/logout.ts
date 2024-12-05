import { call, put } from 'redux-saga/effects'

import UIActions from 'redux/reducers/ui'
import { getRefreshToken, removeRefreshToken } from 'utils/refreshToken'
import { IStats } from '../../../models/IStats'
const { getGeneralStats, logoutApi, logoutAllApi } = require('api')

export default function* logoutWorker({
  payload: { basedOn401Error, isLogoutAll },
}: {
  payload: { basedOn401Error: boolean; isLogoutAll: boolean }
}) {
  try {
    const refreshToken = getRefreshToken()

    if (isLogoutAll) {
      yield call(logoutAllApi)
    } else {
      yield call(logoutApi, refreshToken)
    }

    removeRefreshToken()

    if (!basedOn401Error) {
      const stats: IStats = yield call(getGeneralStats)
      yield put(UIActions.setGeneralStats(stats))
    }
  } catch (reason) {
    console.error('Error while getting general stats data: ', reason)
  }
}
