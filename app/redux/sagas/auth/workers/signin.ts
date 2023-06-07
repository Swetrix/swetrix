import { call, put } from 'redux-saga/effects'
import _isObject from 'lodash/isPlainObject'
import _omit from 'lodash/omit'
import { authActions } from 'redux/reducers/auth'
import { errorsActions } from 'redux/reducers/errors'

import UIActions from 'redux/reducers/ui'
import { setAccessToken } from 'utils/accessToken'
// import { login } from 'api'
import { setRefreshToken } from 'utils/refreshToken'
import sagaActions from '../../actions/index'

export default function* singinWorker({ payload: { credentials, callback } }: {
  payload: {
    credentials: {
      email: string,
      password: string,
      dontRemember: boolean,
    },
    callback: (isSuccess: boolean, isTwoFactorAuthenticationEnabled: boolean) => void,
  },
}) {
  try {
    const { dontRemember } = credentials
    const {
      user, accessToken, refreshToken,
    } = {}
    // yield call(login, _omit(credentials, ['dontRemember']))

    yield put(authActions.setDontRemember(dontRemember))

    if (user.isTwoFactorAuthenticationEnabled) {
      yield call(setAccessToken, accessToken, true)
      yield call(setRefreshToken, refreshToken, true)
      yield put(authActions.updateUserData(user))
      callback(false, true)
      return
    }

    yield put(authActions.loginSuccessful(user))
    yield call(setAccessToken, accessToken, dontRemember)
    yield call(setRefreshToken, refreshToken)
    yield put(UIActions.setThemeType(user.theme))
    yield put(sagaActions.loadProjects())
    yield put(sagaActions.loadSharedProjects())
    yield put(sagaActions.loadProjectAlerts())
    callback(true, false)
  } catch (error) {
    // @ts-ignore
    const err = _isObject(error) ? error.message : error
    yield put(errorsActions.loginFailed({
      message: err || 'apiNotifications.somethingWentWrong',
    }))
    callback(false, false)
  } finally {
    yield put(authActions.finishLoading())
  }
}
