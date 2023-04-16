import { call, put, delay } from 'redux-saga/effects'

import { authActions } from 'redux/reducers/auth'
import { errorsActions } from 'redux/reducers/errors'
import { setAccessToken } from 'utils/accessToken'
import {
  getJWTByGoogleHash, generateGoogleAuthURL,
} from 'api'
import { setRefreshToken } from 'utils/refreshToken'
import { openBrowserWindow } from 'utils/generic'
import sagaActions from '../../actions/index'

const AUTH_WINDOW_WIDTH = 600
const AUTH_WINDOW_HEIGHT = 800

const HASH_CHECK_FREQUENCY = 1000 // 1 second

interface ISSOAuth {
  payload: {
    callback: (isSuccess: boolean, is2FA: boolean) => void
    dontRemember: boolean
    t: (key: string) => string
  }
}

export default function* ssoAuth({ payload: { callback, dontRemember, t } }: ISSOAuth) {
  const authWindow = openBrowserWindow('', AUTH_WINDOW_WIDTH, AUTH_WINDOW_HEIGHT)

  if (!authWindow) {
    yield put(errorsActions.loginFailed({
      message: t('apiNotifications.socialisationAuthGenericError'),
    }))
    callback(false, false)
    return
  }

  try {
    const { uuid, auth_url: authUrl } = yield call(generateGoogleAuthURL)

    // Set the URL of the authentification browser window
    authWindow.location = authUrl

    // Close the authWindow after 5 minutes
    // TODO: THIS VALUE SHOULD BE RETURNED FROM THE API
    setTimeout(() => {
      authWindow.close()
    }, 5 * 60 * 1000)

    while (true) {
      yield delay(HASH_CHECK_FREQUENCY)

      try {
        const {
          accessToken, refreshToken, user,
        } = yield call(getJWTByGoogleHash, uuid)
        authWindow.close()

        yield put(authActions.setDontRemember(dontRemember))

        if (user.isTwoFactorAuthenticationEnabled) {
          yield call(setAccessToken, accessToken, true)
          yield call(setRefreshToken, refreshToken)
          yield put(authActions.updateUserData(user))
          callback(false, true)
          return
        }

        yield put(authActions.loginSuccessful(user))
        yield call(setAccessToken, accessToken, dontRemember)
        yield call(setRefreshToken, refreshToken)
        // yield put(UIActions.setThemeType(user.theme))
        yield put(sagaActions.loadProjects())
        yield put(sagaActions.loadSharedProjects())
        yield put(sagaActions.loadProjectAlerts())
        callback(true, false)
        return
      } catch (reason) {
        // Authentication is not finished yet
      }
      if (authWindow.closed) {
        callback(false, false)
        return
      }
    }
  } catch (reason) {
    yield put(errorsActions.loginFailed({
      message: t('apiNotifications.socialisationAuthGenericError'),
    }))
    callback(false, false)
  }
}
