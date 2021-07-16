import { call, put } from 'redux-saga/effects'
import { authActions } from 'redux/actions/auth'
import { errorsActions } from 'redux/actions/errors'

import UIActions from 'redux/actions/ui'
import { setAccessToken } from 'utils/accessToken'
import { signup } from 'api'

export default function* ({ payload: { data, resetRecaptcha = () => {} } }) {
  try {
    const response = yield call(signup, data)

    yield put(authActions.signupSuccess(response.user))
    yield call(setAccessToken, response.access_token)
    yield put(UIActions.loadProjects())
  } catch (error) {
    yield put(errorsActions.signupFailed(error.message || (typeof error === 'string' ? error : error[0])))
    resetRecaptcha()
  } finally {
    yield put(authActions.finishLoading())
  }
}
