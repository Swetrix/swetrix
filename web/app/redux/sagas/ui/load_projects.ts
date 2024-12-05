import { put, call } from 'redux-saga/effects'
import _map from 'lodash/map'
import _isString from 'lodash/isString'
import { getAccessToken } from 'utils/accessToken'

import UIActions from 'redux/reducers/ui'

import { ENTRIES_PER_PAGE_DASHBOARD } from 'redux/constants'
import { IOverall } from 'redux/models/IProject'
const { getProjects, getOverallStats, getLiveVisitors } = require('../../../api')

export default function* loadProjects({ payload: { take = ENTRIES_PER_PAGE_DASHBOARD, skip = 0, search = '' } }) {
  const token = getAccessToken()

  if (!token) {
    return
  }

  try {
    yield put(
      UIActions.setProjectsLoading({
        isLoading: true,
      }),
    )

    let {
      // eslint-disable-next-line prefer-const, camelcase
      results,
      totalMonthlyEvents,
      total,
    } = yield call(getProjects, take, skip, search)

    const pids = _map(results, (result) => result.id)

    let overall: IOverall = {}

    try {
      overall = yield call(getOverallStats, pids, '7d')
    } catch (reason) {
      console.error('failed to overall stats:', reason)
    }

    yield put(UIActions.setBirdsEyeBulk(overall))

    yield put(
      UIActions.setProjects({
        projects: results,
      }),
    )
    yield put(UIActions.setTotalMonthlyEvents(totalMonthlyEvents))
    yield put(
      UIActions.setTotal({
        total,
      }),
    )

    const liveStats: any[] = yield call(getLiveVisitors, pids)
    yield put(
      UIActions.setLiveStats({
        data: liveStats,
      }),
    )
  } catch (reason: unknown) {
    const { message } = reason as { message: string }
    if (_isString(message)) {
      yield put(UIActions.setProjectsError(message))
    }
    console.error('failed to load projects:', message)
  }
}
