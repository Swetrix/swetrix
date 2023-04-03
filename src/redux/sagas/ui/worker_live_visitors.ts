import {
  put, call, delay, select,
} from 'redux-saga/effects'
import _map from 'lodash/map'
import _filter from 'lodash/filter'
import _isEmpty from 'lodash/isEmpty'

import { getLiveVisitors } from 'api'
import UIActions from 'redux/reducers/ui'
import { LIVE_VISITORS_UPDATE_INTERVAL, tabForSharedProject } from 'redux/constants'
import { ISharedProject } from '../../models/ISharedProject'
import { IProject } from '../../models/IProject'

export default function* liveVisitors() {
  while (true) {
    yield delay(LIVE_VISITORS_UPDATE_INTERVAL)
    const tab: string = yield select(state => state.ui.projects.dashboardTabs)

    if (tabForSharedProject === tab) {
      const sharedProjects: ISharedProject[] = yield select(state => state.ui.projects.sharedProjects)

      if (_isEmpty(sharedProjects)) {
        continue
      }

      const pids = _map(_filter(sharedProjects, ({ project }) => !project?.uiHidden), item => (item?.project?.id ? item.project.id : ''))

      if (_isEmpty(pids)) {
        continue
      }

      const liveStats: any[] = yield call(getLiveVisitors, pids)

      yield put(UIActions.setLiveStats({
        data: liveStats,
        shared: true,
      }))
    } else {
      const projects: IProject[] = yield select(state => state.ui.projects.projects)
      if (_isEmpty(projects)) {
        continue
      }

      const pids = _map(_filter(projects, ({ uiHidden }) => !uiHidden), project => project.id)

      if (_isEmpty(pids)) {
        continue
      }

      const liveStats: any[] = yield call(getLiveVisitors, pids)

      yield put(UIActions.setLiveStats({
        data: liveStats,
        shared: false,
      }))
    }
  }
}
