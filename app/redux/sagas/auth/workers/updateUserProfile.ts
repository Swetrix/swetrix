import { call, put } from 'redux-saga/effects'
import { toast } from 'sonner'

import { authActions } from 'redux/reducers/auth'
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
  } catch (reason: any) {
    toast.error(reason?.message || (typeof reason === 'string' ? reason : reason[0]))
  } finally {
    yield put(authActions.finishLoading())
    callback(isSuccess)
  }
}
