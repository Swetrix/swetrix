import { call, put } from 'redux-saga/effects'
import { authActions } from 'redux/actions/auth'
import { errorsActions } from 'redux/actions/errors'

import UIActions from 'redux/actions/ui'
import { setAccessToken } from 'utils/accessToken'
import { login } from 'api'

export default function* ({ payload: { credentials } }) {
  try {
    const response = yield call(login, credentials)

    yield put(authActions.loginSuccess(response.user))
    yield call(setAccessToken, response.access_token)
    yield put(UIActions.loadProjects())
  } catch (error) {
    console.error(error)
    yield put(errorsActions.loginFailed(error.message))
  } finally {
    yield put(authActions.finishLoading())
  }
}
