import { takeEvery, fork, takeLatest } from 'redux-saga/effects'
import { types } from '../../actions/ui/types'
import { types as authTypes } from '../../actions/auth/types'

import loadProjects from './load_projects'
import initialise from './initialise'
import liveVisitors from './worker_live_visitors'
import generalStats from './worker_general_stats'
import setProjectViewPrefs from './set_project_view_prefs'
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
  yield takeEvery(types.SET_PROJECT_VIEW_PREFS, setProjectViewPrefs)
  yield takeEvery(types.LOAD_PROJECTS, loadProjects)
  yield takeEvery(types.LOAD_SHARED_PROJECTS, loadSharedProjects)
  yield takeEvery(types.LOAD_EXTENSIONS, loadExtensions)
  yield takeEvery(authTypes.LOGOUT, logout)
  yield takeLatest(types.SHARE_VERIFY_ASYNC, shareVerify)
  yield takeLatest(types.LOAD_PROJECT_ALERTS, loadProjectAlerts)
}

export default mainUISaga
