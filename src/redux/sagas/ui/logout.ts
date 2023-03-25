import { put } from 'redux-saga/effects'

import UIActions from 'redux/reducers/ui'

export default function* logout() {
  yield put(UIActions.setProjects({
    projects: [],
  }))
  yield put(UIActions.setProjects({
    projects: [],
    shared: true,
  }))
  yield put(UIActions.setTotal({
    total: 0,
  }))
  yield put(UIActions.setTotal({
    total: 0,
    shared: true,
  }))
  yield put(UIActions.deleteProjectCache({
    pid: '',
    period: '',
    timeBucket: '',
  }))
}
