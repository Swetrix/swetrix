import { call, put } from 'redux-saga/effects'
import { authActions } from 'redux/actions/auth'
import { errorsActions } from 'redux/actions/errors'
import _omit from 'lodash/omit'

import UIActions from 'redux/actions/ui'
import { setAccessToken } from 'utils/accessToken'
import { signup } from 'api'

export default function* signupWorder({ payload: { data: rawData, callback, t } }) {
  try {
    const { repeat, ...data } = rawData
    const { dontRemember } = data
    const response = yield call(signup, _omit(data, ['dontRemember']))

    yield put(authActions.signupSuccess(response.user))
    yield call(setAccessToken, response.accessToken, dontRemember)
    yield put(authActions.setDontRemember(dontRemember))
    yield put(UIActions.setThemeType(response.theme))
    yield put(UIActions.loadProjects())
    yield put(UIActions.loadSharedProjects())
    yield put(UIActions.loadProjectAlerts())
    callback(true)
  } catch (error) {
    const message = error.message || (typeof error === 'string' ? error : error[0])
    yield put(errorsActions.signupFailed(t([`apiNotifications.${message}`, 'apiNotifications.somethingWentWrong'])))
    callback(false)
  } finally {
    yield put(authActions.finishLoading())
  }
}
