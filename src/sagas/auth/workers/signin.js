import { call, put } from 'redux-saga/effects'
import { authActions } from 'actions/auth'
import { errorsActions } from 'actions/errors'
import { setAccessToken } from 'utils/accessToken'
import { login } from 'api'

export default function* ({ payload: { credentials } }) {
  try {
    const response = yield call(login, credentials)

    yield put(authActions.loginSuccess(response.user))
    yield call(setAccessToken, JSON.stringify(response.access_token))
  } catch (error) {
    yield put(errorsActions.loginFailed(error.message))
  } finally {
    yield put(authActions.finishLoading())
  }
}
