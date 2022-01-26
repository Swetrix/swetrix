import { call, put } from 'redux-saga/effects'
import { authActions } from 'redux/actions/auth'
import { errorsActions } from 'redux/actions/errors'

import UIActions from 'redux/actions/ui'
import { setAccessToken } from 'utils/accessToken'
import { signup } from 'api'

export default function* signupWorder({ payload: { data: rawData, callback, t } }) {
  try {
    const { repeat, ...data } = rawData
    const response = yield call(signup, data)

    console.log(response)

    yield put(authActions.signupSuccess(response.user))
    yield call(setAccessToken, response.access_token)
    yield put(UIActions.loadProjects())
    callback(true)
  } catch (error) {
    const message = error.message || (typeof error === 'string' ? error : error[0])
    yield put(errorsActions.signupFailed(t([`apiNotifications.${message}`, 'apiNotifications.somethingWentWrong'])))
    callback(false)
  } finally {
    yield put(authActions.finishLoading())
  }
}
