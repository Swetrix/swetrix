import { put, call } from 'redux-saga/effects'
import _map from 'lodash/map'
import _isString from 'lodash/isString'
import Debug from 'debug'

import UIActions from 'redux/actions/ui'

import { ENTRIES_PER_PAGE_DASHBOARD } from 'redux/constants'
import {
  getProjects, getOverallStats, getLiveVisitors,
} from '../../../api'

const debug = Debug('swetrix:rx:s:load-projects')

export default function* loadProjects({ payload: { take = ENTRIES_PER_PAGE_DASHBOARD, skip = 0 } }) {
  try {
    yield put(UIActions.setProjectsLoading(true))

    let {
      // eslint-disable-next-line prefer-const
      results, totalMonthlyEvents, shared, total,
    } = yield call(getProjects, take, skip)
    const projectWithShared = [..._map(shared, (item) => {
      return {
        shared: true,
        confirmed: item.confirmed,
        ...item.project,
      }
    }), ...results]

    const pids = _map(projectWithShared, result => result.id)
    let overall

    try {
      overall = yield call(getOverallStats, pids)
    } catch (e) {
      debug('failed to overall stats: %s', e)
    }

    results = _map(projectWithShared, res => ({
      ...res,
      overall: overall?.[res.id],
    }))

    yield put(UIActions.setProjects(results))
    yield put(UIActions.setTotalMonthlyEvents(totalMonthlyEvents))
    yield put(UIActions.setTotal(total))

    const liveStats = yield call(getLiveVisitors, pids)
    yield put(UIActions.setLiveStats(liveStats))
  } catch ({ message }) {
    if (_isString(message)) {
      yield put(UIActions.setProjectsError(message))
    }
    debug('failed to load projects: %s', message)
  }
}
