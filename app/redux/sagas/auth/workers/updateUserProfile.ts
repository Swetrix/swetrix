import { call, put } from 'redux-saga/effects'

import { authActions } from 'redux/reducers/auth'
import { errorsActions } from 'redux/reducers/errors'
import { IUser } from '../../../models/IUser'
const { changeUserDetails } = require('api')

export default function* updateUserProfileWorker({
  payload: { data, callback },
}: {
  payload: {
    data: IUser
    callback: (isSuccess: boolean) => void
  }
}) {
  let isSuccess = false
  try {
    const user: IUser = yield call(changeUserDetails, data)

    yield put(authActions.updateUserProfileSuccess(user))
    isSuccess = true
  } catch (e: unknown) {
    const error = e as { message: string } | string[] | string
    yield put(
      errorsActions.updateUserProfileFailed({
        // @ts-ignore
        message: error?.message || (typeof error === 'string' ? error : error[0]),
      }),
    )
  } finally {
    yield put(authActions.finishLoading())
    callback(isSuccess)
  }
}
