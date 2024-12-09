import { call, put } from 'redux-saga/effects'
import type i18next from 'i18next'
import { toast } from 'sonner'

import { authActions } from 'redux/reducers/auth'
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
    yield put(authActions.logout())
    toast.success(t('apiNotifications.accountDeleted'))
  } catch (reason) {
    let message

    try {
      // @ts-ignore
      message = JSON.parse(reason.message).message || 'somethingWentWrong'
    } catch {
      message = 'somethingWentWrong'
    }

    // @ts-ignore
    errorCallback(t([`apiNotifications.${message}`, 'apiNotifications.somethingWentWrong']))
  } finally {
    yield put(authActions.finishLoading())
  }
}
