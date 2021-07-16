import { put, call } from 'redux-saga/effects'
import Debug from 'debug'

import { getProjects } from '../../../api'
import UIActions from 'redux/actions/ui'

const debug = Debug('analytics:rx:s:load-projects')

export default function* () {
  try {
    const { results } = yield call(getProjects)
    yield put(UIActions.setProjects(results))
  } catch (e) {
    const { message } = e
    yield put(UIActions.setProjectsError(message))
    debug('failed to load projects: %s', message)
  }
}
