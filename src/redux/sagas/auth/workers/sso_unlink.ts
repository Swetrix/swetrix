import { call, put } from 'redux-saga/effects'
import _values from 'lodash/values'
import _includes from 'lodash/includes'

import { authActions } from 'redux/reducers/auth'
import { errorsActions } from 'redux/reducers/errors'
import { alertsActions } from 'redux/reducers/alerts'
import {
  unlinkGoogle, authMe,
} from 'api'
import { SOCIALISATIONS } from 'redux/constants'

export interface ISSOUnlink {
  payload: {
    provider: string
    t: (key: string) => string
    callback: (isSuccess: boolean) => void
  }
}

export default function* ssoUnlink({ payload: { provider, t, callback } }: ISSOUnlink) {
  if (!_includes(_values(SOCIALISATIONS), provider)) {
    callback(false)
    return
  }

  try {
    if (provider === SOCIALISATIONS.GOOGLE) {
      yield call(unlinkGoogle)
    }

    // @ts-ignore
    const user = yield call(authMe)
    yield put(authActions.loginSuccessful(user))

    yield put(alertsActions.generateAlerts({
      message: t('apiNotifications.socialAccountUninked'),
      type: 'success',
    }))
    callback(true)
  } catch (reason) {
    yield put(errorsActions.loginFailed({
      message: t('apiNotifications.socialisationUnlinkGenericError'),
    }))
    callback(false)
  }
}
