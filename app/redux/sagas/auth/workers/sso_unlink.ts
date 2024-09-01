import type i18next from 'i18next'
import { call, put } from 'redux-saga/effects'
import _values from 'lodash/values'
import _includes from 'lodash/includes'
import { toast } from 'sonner'

import { authActions } from 'redux/reducers/auth'
import { SSO_PROVIDERS } from 'redux/constants'
const { unlinkSSO, authMe } = require('api')

interface ISSOUnlink {
  payload: {
    provider: string
    t: typeof i18next.t
    callback: (isSuccess: boolean) => void
  }
}

export default function* ssoUnlink({ payload: { provider, t, callback } }: ISSOUnlink) {
  if (!_includes(_values(SSO_PROVIDERS), provider)) {
    callback(false)
    return
  }

  try {
    yield call(unlinkSSO, provider)

    // @ts-ignore
    const user = yield call(authMe)
    yield put(authActions.loginSuccessful(user))

    toast.success(t('apiNotifications.socialAccountUninked'))
    callback(true)
  } catch (reason) {
    toast.error(t('apiNotifications.socialisationUnlinkGenericError'))
    callback(false)
  }
}
