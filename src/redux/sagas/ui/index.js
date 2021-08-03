import { takeEvery, fork } from 'redux-saga/effects'
import { types } from '../../actions/ui/types'
import { types as authTypes } from '../../actions/auth/types'

import loadProjects from './load_projects'
import initialise from './initialise'
import logout from './logout'

function* mainUISaga() {
  yield fork(initialise)
  yield takeEvery(types.LOAD_PROJECTS, loadProjects)
  yield takeEvery(authTypes.LOGOUT, logout)
}

export default mainUISaga
