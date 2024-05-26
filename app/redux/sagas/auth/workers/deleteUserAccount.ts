import { call, put } from 'redux-saga/effects'
import type i18next from 'i18next'

import { authActions } from 'redux/reducers/auth'
import { alertsActions } from 'redux/reducers/alerts'
const { deleteUser } = require('api')

export default function* deleteUserAccountWorker({
  payload: { errorCallback, successCallback, t, deletionFeedback },
}: {
  payload: {
    errorCallback: (error: any) => void
    successCallback: () => void
    t: typeof i18next.t
    deletionFeedback: string
  }
}) {
  try {
    yield call(deleteUser, deletionFeedback)
    yield call(successCallback)
    yield put(authActions.deleteAccountSuccess())
    yield put(
      alertsActions.accountDeleted({
        message: t('apiNotifications.accountDeleted'),
        type: 'success',
      }),
    )
  } catch (error) {
    let message

    try {
      // @ts-ignore
      message = JSON.parse(error.message).message || 'somethingWentWrong'
    } catch (e) {
      message = 'somethingWentWrong'
    }

    // @ts-ignore
    errorCallback(t([`apiNotifications.${message}`, 'apiNotifications.somethingWentWrong']))
  } finally {
    yield put(authActions.finishLoading())
  }
}
