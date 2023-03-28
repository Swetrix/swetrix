import { call, put } from 'redux-saga/effects'
import { authActions } from 'redux/reducers/auth'
import { errorsActions } from 'redux/reducers/errors'
import _omit from 'lodash/omit'

import { setAccessToken } from 'utils/accessToken'
import { signup } from 'api'
import { setRefreshToken } from 'utils/refreshToken'
import sagaActions from '../../actions'

export default function* signupWorder({ payload: { data: rawData, callback } }: {
  payload: {
    data: {
      email: string,
      password: string
      repeat: string
      dontRemember: boolean
    },
    callback: (isSuccess: boolean) => void
  }
}) {
  try {
    const { repeat, ...data } = rawData
    const { dontRemember } = data
    const {
      user, accessToken, refreshToken, // theme,
      // @ts-ignore
    } = yield call(signup, _omit(data, ['dontRemember']))

    yield put(authActions.signupUpSuccessful(user))
    yield call(setAccessToken, accessToken, dontRemember)
    yield call(setRefreshToken, refreshToken)
    yield put(authActions.setDontRemember(dontRemember))
    // yield put(UIActions.setThemeType(response.theme))
    yield put(sagaActions.loadProjects())
    yield put(sagaActions.loadSharedProjects())
    yield put(sagaActions.loadProjectAlerts())
    callback(true)
  } catch (error: unknown) {
    // @ts-ignore
    const message = error.message || (typeof error === 'string' ? error : error[0])
    // @ts-ignore
    yield put(errorsActions.signupFailed(message || 'apiNotifications.somethingWentWrong'))
    callback(false)
  } finally {
    yield put(authActions.finishLoading())
  }
}
