import { call, put } from 'redux-saga/effects'

import { authActions } from 'redux/actions/auth'
import { alertsActions } from 'redux/actions/alerts'
import { deleteUser } from 'api'

export default function* deleteUserAccountWorker({ payload: { errorCallback, successCallback } }) {
  try {
    yield call(deleteUser)
    yield call(successCallback)
    yield put(authActions.deleteAccountSuccess())
    yield put(alertsActions.accountDeleted('Your account has been deleted'))
  } catch (e) {
    errorCallback(JSON.parse(e.message))
  } finally {
    yield put(authActions.finishLoading())
  }
}
