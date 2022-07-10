import { call, put } from 'redux-saga/effects'

import UIActions from 'redux/actions/ui'
import { verifyShare } from 'api'

export default function* shareVerify({ payload: { data, successfulCallback, errorCallback } }) {
  try {
    yield call(verifyShare, data)
    yield put(UIActions.loadProjects())
    yield put(UIActions.loadSharedProjects())
    successfulCallback()
  } catch (error) {
    errorCallback(error)
  }
}
