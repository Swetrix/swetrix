import { call, put } from 'redux-saga/effects'

import { authActions } from 'redux/actions/auth'
import { verifyEmail } from 'api'

export default function* verifyEmailWorker({ payload: { data, successfulCallback, errorCallback } }) {
  try {
    console.log('verifyEmailWorker', data)
    yield call(verifyEmail, data)
    yield put(authActions.emailVerifySuccess())
    successfulCallback()
  } catch (error) {
    errorCallback(error)
  } finally {
    yield put(authActions.finishLoading())
  }
}
