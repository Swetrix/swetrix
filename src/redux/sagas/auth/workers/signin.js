import { call, put } from 'redux-saga/effects'
import { authActions } from 'redux/actions/auth'
import { errorsActions } from 'redux/actions/errors'
import _isObject from 'lodash/isPlainObject'

import UIActions from 'redux/actions/ui'
import { setAccessToken } from 'utils/accessToken'
import { login } from 'api'

export default function* singinWorker({ payload: { credentials, callback } }) {
  try {
    const { dontRemember } = credentials
    const { user, access_token: accessToken } = yield call(login, credentials)

    yield put(authActions.setDontRemember(dontRemember))

    if (user.isTwoFactorAuthenticationEnabled) {
      yield call(setAccessToken, accessToken, true)
      yield put(authActions.updateUserData(user))
      callback(false, true)
      return
    }

    yield put(authActions.loginSuccess(user))
    yield call(setAccessToken, accessToken, dontRemember)
    yield put(UIActions.setThemeType(user.theme))
    yield put(UIActions.loadProjects())
    yield put(UIActions.loadSharedProjects())
    callback(true, false)
  } catch (error) {
    const err = _isObject(error) ? error.message : error
    yield put(errorsActions.loginFailed(err))
    callback(false, false)
  } finally {
    yield put(authActions.finishLoading())
  }
}
