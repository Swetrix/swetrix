import { put, call } from 'redux-saga/effects'
import Debug from 'debug'

import UIActions from 'redux/reducers/ui'
import { isSelfhosted } from 'redux/constants'
import {
  getInstalledExtensions,
} from '../../../api'

const debug = Debug('swetrix:rx:s:load-extensions')

export default function* loadExtensions() {
  if (isSelfhosted) {
    return
  }

  try {
    const { extensions } = yield call(getInstalledExtensions)

    yield put(UIActions.setExtensions(extensions))
  } catch (e: unknown) {
    const { message } = e as { message: string }
    // if (_isString(message)) {
    //   yield put(UIActions.setProjectsError(message))
    // }
    debug('failed to load extensions: %s', message)
  }
}
