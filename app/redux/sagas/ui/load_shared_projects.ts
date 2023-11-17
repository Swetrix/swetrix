import { put, call } from 'redux-saga/effects'
import _map from 'lodash/map'
import _isString from 'lodash/isString'
import Debug from 'debug'

import UIActions from 'redux/reducers/ui'

import { ENTRIES_PER_PAGE_DASHBOARD, isSelfhosted } from 'redux/constants'
import { IOverall } from 'redux/models/IProject'
const {
  getSharedProjects, getOverallStats, getLiveVisitors,
} = require('api')

const debug = Debug('swetrix:rx:s:load-projects')

export default function* loadSharedProjects({ payload: { take = ENTRIES_PER_PAGE_DASHBOARD, skip = 0, search = '' } }) {
  if (isSelfhosted) {
    return
  }

  try {
    yield put(UIActions.setProjectsLoading({
      isLoading: true,
      shared: true,
    }))

    let {
      // eslint-disable-next-line prefer-const
      results, total,
    } = yield call(getSharedProjects, take, skip, search)

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
      overall = yield call(getOverallStats, pids, '7d')
      yield put(UIActions.setBirdsEyeBulk(overall))
    } catch (e) {
      debug('failed to overall stats: %s', e)
    }

    yield put(UIActions.setProjects({
      projects: projectsWithShared,
      shared: true,
    }))
    yield put(UIActions.setTotal({
      total,
      shared: true,
    }))

    const liveStats: any[] = yield call(getLiveVisitors, pids)
    yield put(UIActions.setLiveStats({
      data: liveStats,
    }))
  } catch (e: unknown) {
    const { message } = e as { message: string }
    if (_isString(message)) {
      yield put(UIActions.setProjectsError(message))
    }
    debug('failed to load shared projects: %s', message)
  }
}
