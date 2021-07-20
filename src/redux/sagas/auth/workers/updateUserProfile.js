import { call, put } from 'redux-saga/effects'

import { authActions } from 'redux/actions/auth'
import { errorsActions } from 'redux/actions/errors'
import { changeUserDetails } from 'api'

export default function* updateUserProfileWorker({ payload: { data, successfulCallback } }) {
  try {
    const user = yield call(changeUserDetails, data)

    yield put(authActions.updateProfileSuccess(user))
    successfulCallback()
  } catch (error) {
    yield put(errorsActions.updateProfileFailed(error.message || (typeof error === 'string' ? error : error[0])))
  } finally {
    yield put(authActions.finishLoading())
  }
}
