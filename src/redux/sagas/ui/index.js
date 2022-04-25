import { takeEvery, fork } from 'redux-saga/effects'
import { types } from '../../actions/ui/types'
import { types as authTypes } from '../../actions/auth/types'

import loadProjects from './load_projects'
import initialise from './initialise'
import liveVisitors from './worker_live_visitors'
// import generalStats from './worker_general_stats'
import setProjectViewPrefs from './set_project_view_prefs'
import isEventsAvailable from './worker_is_events_available'
import logout from './logout'

function* mainUISaga() {
  yield fork(initialise)
  yield fork(liveVisitors)
  yield fork(isEventsAvailable)
  // yield fork(generalStats)
  yield takeEvery(types.SET_PROJECT_VIEW_PREFS, setProjectViewPrefs)
  yield takeEvery(types.LOAD_PROJECTS, loadProjects)
  yield takeEvery(authTypes.LOGOUT, logout)
}

export default mainUISaga
