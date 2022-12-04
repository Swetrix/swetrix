import { call, put } from 'redux-saga/effects'
import { authActions } from 'redux/actions/auth'
import { errorsActions } from 'redux/actions/errors'

import UIActions from 'redux/actions/ui'
import { setAccessToken } from 'utils/accessToken'
import { signup } from 'api'

export default function* signupWorder({ payload: { data: rawData, callback, t } }) {
  try {
    const { repeat, ...data } = rawData
    const { dontRemember } = data
    const response = yield call(signup, data)

    yield put(authActions.signupSuccess(response.user))
    yield call(setAccessToken, response.access_token, dontRemember)
    yield put(authActions.setDontRemember(dontRemember))
    yield put(UIActions.setThemeType(response.theme))
    yield put(UIActions.loadProjects())
    yield put(UIActions.loadSharedProjects())
    callback(true)
  } catch (error) {
    const message = error.message || (typeof error === 'string' ? error : error[0])
    yield put(errorsActions.signupFailed(t([`apiNotifications.${message}`, 'apiNotifications.somethingWentWrong'])))
    callback(false)
  } finally {
    yield put(authActions.finishLoading())
  }
}
