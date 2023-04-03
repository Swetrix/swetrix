import { call, put } from 'redux-saga/effects'

import { verifyShare } from 'api'
import sagaActions from '../actions'

export default function* shareVerify({ payload: { data, successfulCallback, errorCallback } }: {
  payload: {
    data: {
      path: string,
      id: string,
    },
    successfulCallback: () => void,
    errorCallback: (error: any) => void,
  },
}) {
  try {
    // @ts-ignore
    yield call(verifyShare, data)
    yield put(sagaActions.loadProjects())
    yield put(sagaActions.loadSharedProjects())
    successfulCallback()
  } catch (error) {
    errorCallback(error)
  }
}
