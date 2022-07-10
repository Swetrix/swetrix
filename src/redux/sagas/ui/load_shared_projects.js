import { put, call } from 'redux-saga/effects'
import _map from 'lodash/map'
import _isString from 'lodash/isString'
import Debug from 'debug'

import UIActions from 'redux/actions/ui'

import { ENTRIES_PER_PAGE_DASHBOARD } from 'redux/constants'
import {
  getSharedProjects, getOverallStats, getLiveVisitors,
} from '../../../api'

const debug = Debug('swetrix:rx:s:load-projects')

export default function* loadSharedProjects({ payload: { take = ENTRIES_PER_PAGE_DASHBOARD, skip = 0 } }) {
  try {
    yield put(UIActions.setProjectsLoading(true))

    let {
      // eslint-disable-next-line prefer-const
      results, totalMonthlyEvents, total,
    } = yield call(getSharedProjects, take, skip)
    const projectsWithShared = _map(results, (project) => {
      return {
        ...project,
        project: {
          ...project.project,
          shared: true,
        },
      }
    })
    const pids = _map(projectsWithShared, ({ project }) => project.id)
    let overall

    try {
      overall = yield call(getOverallStats, pids)
    } catch (e) {
      debug('failed to overall stats: %s', e)
    }

    results = _map(projectsWithShared, res => ({
      ...res,
      project: {
        ...res.project,
        overall: overall?.[res.project.id],
      },
    }))

    yield put(UIActions.setProjects(results, true))
    yield put(UIActions.setTotalMonthlyEvents(totalMonthlyEvents))
    yield put(UIActions.setTotal(total, true))

    const liveStats = yield call(getLiveVisitors, pids)
    yield put(UIActions.setLiveStats(liveStats, true))
  } catch ({ message }) {
    if (_isString(message)) {
      yield put(UIActions.setProjectsError(message))
    }
    debug('failed to load projects: %s', message)
  }
}
