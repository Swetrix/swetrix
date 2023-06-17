import { fork } from 'redux-saga/effects'
import watchAuth from './auth/watchers'
import mainUISaga from './ui'

export default function* rootSaga() {
  yield fork(watchAuth)
  yield fork(mainUISaga)
}
