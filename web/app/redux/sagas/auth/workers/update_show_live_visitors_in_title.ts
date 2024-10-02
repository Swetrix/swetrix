import { call, put } from 'redux-saga/effects'
import { toast } from 'sonner'

import { authActions } from 'redux/reducers/auth'
import { IUser } from '../../../models/IUser'
const { setShowLiveVisitorsInTitle } = require('api')

interface IPayload {
  show: boolean
  callback: (isSuccess: boolean) => void
}

export default function* updateShowLiveVisitorsInTitle({ payload: { show, callback } }: { payload: IPayload }) {
  let isSuccess = false

  try {
    const user: Partial<IUser> = yield call(setShowLiveVisitorsInTitle, show)

    yield put(authActions.partiallyOverwriteUser(user))
    isSuccess = true
  } catch (reason: any) {
    toast.error(reason?.message || (typeof reason === 'string' ? reason : reason[0]))
  } finally {
    callback(isSuccess)
  }
}
