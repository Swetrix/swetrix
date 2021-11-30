import { put, call, delay, select } from 'redux-saga/effects'
import _map from 'lodash/map'

import { getLiveVisitors } from 'api'
import UIActions from 'redux/actions/ui'

const LIVE_VISITORS_UPDATE_INTERVAL = 58000

export default function* liveVisitors() {
  while (true) {
    yield delay(2000)

    let projects = yield select(state => state.ui.projects.projects)
    const pids = _map(projects, project => project.id)
    const liveStats = yield call(getLiveVisitors, pids)

    yield put(UIActions.setLiveStats(liveStats))
    yield delay(LIVE_VISITORS_UPDATE_INTERVAL)
  }
}
