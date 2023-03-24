import { call, put } from 'redux-saga/effects'

import { authActions } from 'redux/actions/auth'
import { alertsActions } from 'redux/actions/alerts'
import { deleteUser } from 'api'

export default function* deleteUserAccountWorker({ payload: { errorCallback, successCallback, t } }) {
  try {
    yield call(deleteUser)
    yield call(successCallback)
    yield put(authActions.deleteAccountSuccess())
    yield put(alertsActions.accountDeleted(t('apiNotifications.accountDeleted')))
  } catch (error) {
    let message

    try {
      message = JSON.parse(error.message).message || 'somethingWentWrong'
    } catch (e) {
      message = 'somethingWentWrong'
    }

    errorCallback(t([`apiNotifications.${message}`, 'apiNotifications.somethingWentWrong']))
  } finally {
    yield put(authActions.finishLoading())
  }
}
