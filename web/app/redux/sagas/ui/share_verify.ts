import { call, put } from 'redux-saga/effects'
import sagaActions from '../actions'
const { verifyShare } = require('api')

export default function* shareVerify({
  payload: { data, successfulCallback, errorCallback },
}: {
  payload: {
    data: {
      path: string
      id: string
    }
    successfulCallback: () => void
    errorCallback: (error: any) => void
  }
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
