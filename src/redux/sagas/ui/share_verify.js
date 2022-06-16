import { call, put } from 'redux-saga/effects'

import UIActions from 'redux/actions/ui'
import { verifyShare } from 'api'

export default function* shareVerify({ payload: { data, successfulCallback, errorCallback } }) {
  try {
    yield call(verifyShare, data)
    yield put(UIActions.loadProjects())
    successfulCallback()
  } catch (error) {
    errorCallback(error)
  }
}
