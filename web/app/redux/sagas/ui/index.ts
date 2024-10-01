import { takeEvery, fork, takeLatest } from 'redux-saga/effects'
import sagaTypes from '../actions/types'
import loadProjects from './load_projects'
import initialise from './initialise'
import liveVisitors from './worker_live_visitors'
import generalStats from './worker_general_stats'
import isEventsAvailable from './worker_is_events_available'
import shareVerify from './share_verify'
import loadExtensions from './load_extensions'
import loadMetainfo from './load_metainfo'
import loadUsageinfo from './load_usageinfo'
import logout from './logout'
import loadSharedProjects from './load_shared_projects'
import loadProjectAlerts from './load_alerts'
import loadMonitors from './load_monitors'

function* mainUISaga() {
  yield fork(initialise)
  yield fork(liveVisitors)
  yield fork(isEventsAvailable)
  yield fork(generalStats)
  // @ts-expect-error
  yield takeEvery(sagaTypes.LOAD_PROJECTS, loadProjects)
  yield takeEvery(sagaTypes.LOAD_METAINFO, loadMetainfo)
  yield takeEvery(sagaTypes.LOAD_USAGEINFO, loadUsageinfo)
  // @ts-expect-error
  yield takeEvery(sagaTypes.LOAD_SHARED_PROJECTS, loadSharedProjects)
  yield takeEvery(sagaTypes.LOAD_EXTENSIONS, loadExtensions)
  yield takeEvery(sagaTypes.LOGOUT, logout)
  // @ts-expect-error
  yield takeLatest(sagaTypes.SHARE_VERIFY_ASYNC, shareVerify)
  // @ts-expect-error
  yield takeLatest(sagaTypes.LOAD_PROJECT_ALERTS, loadProjectAlerts)
  // @ts-expect-error
  yield takeLatest(sagaTypes.LOAD_MONITORS, loadMonitors)
}

export default mainUISaga
