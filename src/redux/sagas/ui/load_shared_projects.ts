import { put, call } from 'redux-saga/effects'
import _map from 'lodash/map'
import _isString from 'lodash/isString'
import Debug from 'debug'

import UIActions from 'redux/reducers/ui'

import { ENTRIES_PER_PAGE_DASHBOARD } from 'redux/constants'
import { IOverall } from 'redux/models/IProject'
import {
  getSharedProjects, getOverallStats, getLiveVisitors,
} from '../../../api'

const debug = Debug('swetrix:rx:s:load-projects')

export default function* loadSharedProjects({ payload: { take = ENTRIES_PER_PAGE_DASHBOARD, skip = 0 } }) {
  try {
    yield put(UIActions.setProjectsLoading({
      isLoading: true,
      shared: true,
    }))

    let {
      // eslint-disable-next-line prefer-const
      results, total,
    } = yield call(getSharedProjects, take, skip)

    if (total === 0) {
      return
    }

    const projectsWithShared = _map(results, (result) => {
      return {
        ...result,
        project: {
          ...result.project,
          shared: true,
        },
      }
    })
    const pids = _map(projectsWithShared, ({ project }) => project.id)

    let overall: IOverall

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

    yield put(UIActions.setProjects({
      projects: results,
      shared: true,
    }))
    yield put(UIActions.setTotal({
      total,
      shared: true,
    }))

    const liveStats: any[] = yield call(getLiveVisitors, pids)
    yield put(UIActions.setLiveStats({
      data: liveStats,
      shared: true,
    }))
  } catch (e: unknown) {
    const { message } = e as { message: string }
    if (_isString(message)) {
      yield put(UIActions.setProjectsError(message))
    }
    debug('failed to load shared projects: %s', message)
  }
}
