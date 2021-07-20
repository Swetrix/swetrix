import { call, put } from 'redux-saga/effects'

import { authActions } from 'redux/actions/auth'
import { deleteUser } from 'api'

export default function* deleteUserAccountWorker({ payload: { errorCallback } }) {
  try {
    yield call(deleteUser)
    yield put(authActions.deleteAccountSuccess())
  } catch (e) {
    errorCallback(JSON.parse(e.message))
  } finally {
    yield put(authActions.finishLoading())
  }
}
