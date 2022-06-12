import { put, call } from 'redux-saga/effects'
import _map from 'lodash/map'
import _isString from 'lodash/isString'
import Debug from 'debug'

import UIActions from 'redux/actions/ui'
import {
  getProjects, getOverallStats, getLiveVisitors,
} from '../../../api'

const debug = Debug('swetrix:rx:s:load-projects')

export default function* loadProjects() {
  try {
    // eslint-disable-next-line prefer-const
    let { results, totalMonthlyEvents, shared } = yield call(getProjects)
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

    const liveStats = yield call(getLiveVisitors, pids)
    yield put(UIActions.setLiveStats(liveStats))
  } catch ({ message }) {
    if (_isString(message)) {
      yield put(UIActions.setProjectsError(message))
    }
    debug('failed to load projects: %s', message)
  }
}
