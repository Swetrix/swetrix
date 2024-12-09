import { put, call, delay, select } from 'redux-saga/effects'
import _map from 'lodash/map'
import _filter from 'lodash/filter'
import _isEmpty from 'lodash/isEmpty'

import UIActions from 'redux/reducers/ui'
import { LIVE_VISITORS_UPDATE_INTERVAL } from 'redux/constants'
import { IProject } from '../../models/IProject'
const { getLiveVisitors } = require('api')

export default function* liveVisitors() {
  while (true) {
    yield delay(LIVE_VISITORS_UPDATE_INTERVAL)

    const projects: IProject[] = yield select((state) => state.ui.projects.projects)

    if (_isEmpty(projects)) {
      continue
    }

    const pids = _map(
      _filter(projects, ({ uiHidden }) => !uiHidden),
      (project) => project.id,
    )

    if (_isEmpty(pids)) {
      continue
    }

    const liveStats: any[] = yield call(getLiveVisitors, pids)

    yield put(
      UIActions.setLiveStats({
        data: liveStats,
      }),
    )
  }
}
