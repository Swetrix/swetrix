import { fork } from 'redux-saga/effects'
import watchAuth from './auth/watchers'
import uiSaga from './ui'

export default function* rootSaga() {
  yield fork(watchAuth)
  yield fork(uiSaga)
}