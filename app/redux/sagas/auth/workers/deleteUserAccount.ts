import { call, put } from 'redux-saga/effects'

import { authActions } from 'redux/reducers/auth'
import { alertsActions } from 'redux/reducers/alerts'
// import { deleteUser } from 'api'

export default function* deleteUserAccountWorker({ payload: { errorCallback, successCallback, t } }: {
  payload: {
    errorCallback: (error: any) => void,
    successCallback: () => void,
    t: (key: string) => string,
  },
}) {
  try {
    // yield call(deleteUser)
    yield call(successCallback)
    yield put(authActions.deleteAccountSuccess())
    yield put(alertsActions.accountDeleted({
      message: t('apiNotifications.accountDeleted'),
      type: 'success',
    }))
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
