import { call, put } from 'redux-saga/effects'

import { authActions } from 'redux/reducers/auth'
import { verifyEmail } from 'api'

export default function* verifyEmailWorker({ payload: { data, successfulCallback, errorCallback } }: {
  payload: {
    data: {
      id: string,
    },
    successfulCallback: () => void,
    errorCallback: (error: any) => void,
  },
}) {
  try {
    // @ts-ignore
    yield call(verifyEmail, data)
    yield put(authActions.emailVerifySuccessful())
    successfulCallback()
  } catch (error) {
    errorCallback(error)
  } finally {
    yield put(authActions.finishLoading())
  }
}
