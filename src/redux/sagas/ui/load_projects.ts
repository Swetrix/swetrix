import { put, call } from 'redux-saga/effects'
import _map from 'lodash/map'
import _isString from 'lodash/isString'
import Debug from 'debug'

import UIActions from 'redux/reducers/ui'

import { ENTRIES_PER_PAGE_DASHBOARD } from 'redux/constants'
import { IOverall } from 'redux/models/IProject'
import {
  getProjects, getOverallStats, getLiveVisitors, getOverallStatsCaptcha,
} from '../../../api'

const debug = Debug('swetrix:rx:s:load-projects')

export default function* loadProjects({ payload: { take = ENTRIES_PER_PAGE_DASHBOARD, skip = 0, isCaptcha = false } }) {
  try {
    if (isCaptcha) {
      yield put(UIActions.setCaptchaLoading(true))
    } else {
      yield put(UIActions.setProjectsLoading({
        isLoading: true,
        shared: false,
      }))
    }

    let {
      // eslint-disable-next-line prefer-const
      results, totalMonthlyEvents, total,
    } = yield call(getProjects, take, skip, isCaptcha)

    const pids = _map(results, result => result.id)

    let overall: IOverall

    if (isCaptcha) {
      try {
        overall = yield call(getOverallStatsCaptcha, pids)
      } catch (e) {
        debug('failed to overall stats: %s', e)
      }
    } else {
      try {
        overall = yield call(getOverallStats, pids)
      } catch (e) {
        debug('failed to overall stats: %s', e)
      }
    }

    results = _map(results, res => ({
      ...res,
      overall: overall?.[res.id],
    }))

    if (isCaptcha) {
      yield put(UIActions.setCaptchaProjects(results))
      yield put(UIActions.setCaptchaTotal(total))
    } else {
      yield put(UIActions.setProjects(results))
      yield put(UIActions.setTotalMonthlyEvents(totalMonthlyEvents))
      yield put(UIActions.setTotal(total))
    }

    const liveStats: any[] = yield call(getLiveVisitors, pids)
    yield put(UIActions.setLiveStats({
      data: liveStats,
      shared: false,
    }))
  } catch (e: unknown) {
    const { message } = e as { message: string }
    if (_isString(message)) {
      yield put(UIActions.setProjectsError(message))
    }
    debug('failed to load projects: %s', message)
  }
}
