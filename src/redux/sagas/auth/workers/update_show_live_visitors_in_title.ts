import { call, put } from 'redux-saga/effects'

import { authActions } from 'redux/reducers/auth'
import { errorsActions } from 'redux/reducers/errors'
import { setShowLiveVisitorsInTitle } from 'api'
import { IUser } from '../../../models/IUser'

interface IPayload {
  show: boolean
  callback: (isSuccess: boolean) => void
}

export default function* updateShowLiveVisitorsInTitle({ payload: { show, callback } }: {
  payload: IPayload
}) {
  let isSuccess = false

  try {
    const user: Partial<IUser> = yield call(setShowLiveVisitorsInTitle, show)

    yield put(authActions.partiallyOverwriteUser(user))
    isSuccess = true
  } catch (e: unknown) {
    const error = e as { message: string } | string[] | string
    yield put(errorsActions.updateUserProfileFailed({
      // @ts-ignore
      message: error?.message || (typeof error === 'string' ? error : error[0]),
    }))
  } finally {
    callback(isSuccess)
  }
}
