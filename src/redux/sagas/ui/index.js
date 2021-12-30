import { takeEvery, fork } from 'redux-saga/effects'
import { types } from '../../actions/ui/types'
import { types as authTypes } from '../../actions/auth/types'

import loadProjects from './load_projects'
import initialise from './initialise'
import liveVisitors from './worker_live_visitors'
// import generalStats from './worker_general_stats'
import logout from './logout'

function* mainUISaga() {
  yield fork(initialise)
  yield fork(liveVisitors)
  // yield fork(generalStats)
  yield takeEvery(types.LOAD_PROJECTS, loadProjects)
  yield takeEvery(authTypes.LOGOUT, logout)
}

export default mainUISaga
