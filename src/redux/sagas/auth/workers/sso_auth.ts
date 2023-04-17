import { call, put, delay } from 'redux-saga/effects'

import { authActions } from 'redux/reducers/auth'
import { errorsActions } from 'redux/reducers/errors'
import { setAccessToken } from 'utils/accessToken'
import {
  getJWTBySSOHash, generateSSOAuthURL,
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
    provider: string
  }
}

export default function* ssoAuth({
  payload: {
    callback, dontRemember, t, provider,
  },
}: ISSOAuth) {
  const authWindow = openBrowserWindow('', AUTH_WINDOW_WIDTH, AUTH_WINDOW_HEIGHT)

  if (!authWindow) {
    yield put(errorsActions.loginFailed({
      message: t('apiNotifications.socialisationAuthGenericError'),
    }))
    callback(false, false)
    return
  }

  try {
    const {
      uuid, auth_url: authUrl, expires_in: expiresIn,
    } = yield call(generateSSOAuthURL, provider)

    // Set the URL of the authentification browser window
    authWindow.location = authUrl

    // Closing the authorisation window after the session expires
    setTimeout(authWindow.close, expiresIn)

    while (true) {
      yield delay(HASH_CHECK_FREQUENCY)

      try {
        const {
          accessToken, refreshToken, user,
        } = yield call(getJWTBySSOHash, uuid, provider)
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
        yield put(authActions.finishLoading())
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
