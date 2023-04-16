import { call, put, delay } from 'redux-saga/effects'
import _isObject from 'lodash/isPlainObject'
import _omit from 'lodash/omit'

import UIActions from 'redux/reducers/ui'
import { authActions } from 'redux/reducers/auth'
import { errorsActions } from 'redux/reducers/errors'
import { setAccessToken } from 'utils/accessToken'
import {
  getJWTByGoogleHash, generateGoogleAuthURL,
} from 'api'
import { setRefreshToken } from 'utils/refreshToken'
import sagaActions from '../../actions/index'
import { openBrowserWindow } from 'utils/generic'

const AUTH_WINDOW_WIDTH = 600
const AUTH_WINDOW_HEIGHT = 800

const HASH_CHECK_FREQUENCY = 1000 // 1 second

// TODO: Add types
export default function* ssoAuth({ payload: { callback, dontRemember } }: any) {
  console.log('ssoAuth worker')
  const authWindow = openBrowserWindow('', AUTH_WINDOW_WIDTH, AUTH_WINDOW_HEIGHT)

  if (!authWindow) {
    // TODO: Check the issue later
    // @ts-ignore
    yield put(errorsActions.loginFailed('SOMETHING WENT WRONG (THIS MESSAGE SHOULD BE SENT VIA I18N)'))
    // callback(false, false)
    return
  }

  try {
    const { uuid, auth_url: authUrl } = yield call(generateGoogleAuthURL)

    console.log(uuid, authUrl)

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
        yield put(UIActions.setThemeType(user.theme))
        yield put(sagaActions.loadProjects())
        yield put(sagaActions.loadSharedProjects())
        yield put(sagaActions.loadProjectAlerts())
        callback(true, false)
      } catch (reason) {
        // Authentication is not finished yet
      }
      if (authWindow.closed) {
        // callback(false, false)
        return
      }
    }
  } catch (reason) {
    // TODO: Display notification. Something went wrong while generating auth URL
  }
}
