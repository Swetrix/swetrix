import { put, call } from 'redux-saga/effects'
import _map from 'lodash/map'
import _isString from 'lodash/isString'
import Debug from 'debug'

import { getProjects, getOverallStats } from '../../../api'
import UIActions from 'redux/actions/ui'

const debug = Debug('analytics:rx:s:load-projects')

export default function* loadProjects() {
  try {
    let { results } = yield call(getProjects)
    const pids = _map(results, result => result.id)
    const overall = yield call(getOverallStats, pids)

    results = _map(results, res => ({
      ...res,
      overall: overall[res.id],
    }))
    yield put(UIActions.setProjects(results))
  } catch ({ message }) {
    if (_isString(message)) {
      yield put(UIActions.setProjectsError(message))
    }
    debug('failed to load projects: %s', message)
  }
}
