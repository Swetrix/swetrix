import { call, put } from 'redux-saga/effects'
import { authActions } from 'redux/reducers/auth'
import { toast } from 'sonner'

import { setAccessToken } from 'utils/accessToken'
import { setRefreshToken } from 'utils/refreshToken'
import { getCookie, deleteCookie } from 'utils/cookie'
import { REFERRAL_COOKIE } from 'redux/constants'
import sagaActions from '../../actions'
const { signup } = require('api')

export default function* signupWorder({
  payload: { data: rawData, callback },
}: {
  payload: {
    data: {
      email: string
      password: string
      repeat: string
      dontRemember: boolean
      checkIfLeaked: boolean
    }
    callback: (isSuccess: boolean) => void
  }
}) {
  try {
    const { dontRemember } = rawData
    const refCode = getCookie(REFERRAL_COOKIE)
    const {
      user,
      accessToken,
      refreshToken, // theme,
      // @ts-ignore
    } = yield call(signup, {
      email: rawData.email,
      password: rawData.password,
      checkIfLeaked: rawData.checkIfLeaked,
      refCode,
    })

    if (refCode) {
      deleteCookie(REFERRAL_COOKIE)
    }

    yield put(authActions.signupUpSuccessful(user))
    yield call(setAccessToken, accessToken, dontRemember)
    yield call(setRefreshToken, refreshToken)
    yield put(authActions.setDontRemember(dontRemember))
    // yield put(UIActions.setThemeType(response.theme))
    yield put(sagaActions.loadProjects())
    yield put(sagaActions.loadSharedProjects())
    yield put(sagaActions.loadProjectAlerts())
    yield put(sagaActions.loadMonitors())
    callback(true)
  } catch (error: any) {
    const message = error.message || (typeof error === 'string' ? error : error[0])

    toast.error(message)
    callback(false)
  } finally {
    yield put(authActions.finishLoading())
  }
}
