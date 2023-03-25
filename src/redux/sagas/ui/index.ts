import { takeEvery, fork, takeLatest } from 'redux-saga/effects'
import sagaTypes from '../actions/types'

import loadProjects from './load_projects'
import initialise from './initialise'
import liveVisitors from './worker_live_visitors'
import generalStats from './worker_general_stats'
import isEventsAvailable from './worker_is_events_available'
import shareVerify from './share_verify'
import loadExtensions from './load_extensions'
import logout from './logout'
import loadSharedProjects from './load_shared_projects'
import loadProjectAlerts from './load_alerts'

function* mainUISaga() {
  yield fork(initialise)
  yield fork(liveVisitors)
  yield fork(isEventsAvailable)
  yield fork(generalStats)
  // @ts-ignore
  yield takeEvery(sagaTypes.LOAD_PROJECTS, loadProjects)
  // @ts-ignore
  yield takeEvery(sagaTypes.LOAD_SHARED_PROJECTS, loadSharedProjects)
  yield takeEvery(sagaTypes.LOAD_EXTENSIONS, loadExtensions)
  // @ts-ignore
  yield takeEvery(sagaTypes.LOGOUT, logout)
  // @ts-ignore
  yield takeLatest(sagaTypes.SHARE_VERIFY_ASYNC, shareVerify)
  // @ts-ignore
  yield takeLatest(sagaTypes.LOAD_PROJECT_ALERTS, loadProjectAlerts)
}

export default mainUISaga
