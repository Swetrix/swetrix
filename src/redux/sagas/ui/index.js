import { takeEvery, fork } from 'redux-saga/effects'
import { types } from '../../actions/ui/types'

import loadProjects from './load_projects'
import initialise from './initialise'

function* mainUISaga() {
  yield fork(initialise)
  yield takeEvery(types.LOAD_PROJECTS, loadProjects)
}

export default mainUISaga
