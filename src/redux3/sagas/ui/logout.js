import { put } from 'redux-saga/effects'

import UIActions from 'redux/actions/ui'

export default function* logout() {
  yield put(UIActions.setProjects([]))
  yield put(UIActions.setProjects([], true))
  yield put(UIActions.setTotal(0))
  yield put(UIActions.setTotal(0, true))
  yield put(UIActions.deleteProjectCache())
}
