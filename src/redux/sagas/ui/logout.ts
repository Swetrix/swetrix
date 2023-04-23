import { put } from 'redux-saga/effects'

import UIActions from 'redux/reducers/ui'

export default function* logout() {
  yield put(UIActions.reset())
}
