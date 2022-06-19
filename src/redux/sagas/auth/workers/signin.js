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
    const response = yield call(login, credentials)

    yield put(authActions.loginSuccess(response.user))
    yield call(setAccessToken, response.access_token, dontRemember)
    yield put(authActions.setDontRemember(dontRemember))
    yield put(UIActions.loadProjects())
    callback(true)
  } catch (error) {
    const err = _isObject(error) ? error.message : error
    yield put(errorsActions.loginFailed(err))
    callback(false)
  } finally {
    yield put(authActions.finishLoading())
  }
}
