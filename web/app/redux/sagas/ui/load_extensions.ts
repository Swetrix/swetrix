import { put, call } from 'redux-saga/effects'

import UIActions from 'redux/reducers/ui'
import { isSelfhosted } from 'redux/constants'
const { getInstalledExtensions } = require('api')

export default function* loadExtensions() {
  if (isSelfhosted) {
    return
  }

  try {
    const { extensions } = yield call(getInstalledExtensions)

    yield put(UIActions.setExtensions(extensions))
  } catch (reason: unknown) {
    const { message } = reason as { message: string }
    // if (_isString(message)) {
    //   yield put(UIActions.setProjectsError(message))
    // }
    console.error('failed to load extensions:', message)
  }
}
