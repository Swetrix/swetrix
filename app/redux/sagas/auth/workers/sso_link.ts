import { call, put, delay } from 'redux-saga/effects'
import type i18next from 'i18next'

import { authActions } from 'redux/reducers/auth'
import { errorsActions } from 'redux/reducers/errors'
import { alertsActions } from 'redux/reducers/alerts'
import { openBrowserWindow } from 'utils/generic'
const { linkBySSOHash, generateSSOAuthURL, authMe } = require('api')

const AUTH_WINDOW_WIDTH = 600
const AUTH_WINDOW_HEIGHT = 800

const HASH_CHECK_FREQUENCY = 1000 // 1 second

export interface ISSOLink {
  payload: {
    callback: (isSuccess: boolean) => void
    t: typeof i18next.t
    provider: string
  }
}

export default function* ssoLink({ payload: { callback, t, provider } }: ISSOLink) {
  const authWindow = openBrowserWindow('', AUTH_WINDOW_WIDTH, AUTH_WINDOW_HEIGHT)

  if (!authWindow) {
    yield put(
      errorsActions.loginFailed({
        message: t('apiNotifications.socialisationGenericError'),
      }),
    )
    callback(false)
    return
  }

  try {
    const { uuid, auth_url: authUrl, expires_in: expiresIn } = yield call(generateSSOAuthURL, provider)

    // Set the URL of the authentification browser window
    authWindow.location = authUrl

    // Closing the authorisation window after the session expires
    setTimeout(authWindow.close, expiresIn)

    while (true) {
      yield delay(HASH_CHECK_FREQUENCY)

      try {
        yield call(linkBySSOHash, uuid, provider)
        authWindow.close()

        // @ts-ignore
        const user = yield call(authMe)
        yield put(authActions.loginSuccessful(user))

        yield put(
          alertsActions.generateAlerts({
            message: t('apiNotifications.socialAccountLinked'),
            type: 'success',
          }),
        )

        callback(true)
        return
      } catch (reason) {
        // Authentication is not finished yet
      }
      if (authWindow.closed) {
        callback(false)
        return
      }
    }
  } catch (reason) {
    yield put(
      errorsActions.loginFailed({
        message: t('apiNotifications.socialisationGenericError'),
      }),
    )
    callback(false)
  }
}
