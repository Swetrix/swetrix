import { put, call } from 'redux-saga/effects'
import Debug from 'debug'

import UIActions from 'redux/reducers/ui'
import { isSelfhosted } from 'redux/constants'
import { IMetainfo } from 'redux/models/IMetainfo'
import {
  getPaymentMetainfo,
} from '../../../api'

const debug = Debug('swetrix:rx:s:load-extensions')

export default function* loadMetainfo() {
  if (isSelfhosted) {
    return
  }

  try {
    const metainfo: IMetainfo = yield call(getPaymentMetainfo)

    yield put(UIActions.setMetainfo(metainfo))
  } catch (e: unknown) {
    const { message } = e as { message: string }
    // if (_isString(message)) {
    //   yield put(UIActions.setProjectsError(message))
    // }
    debug('failed to load metainfo: %s', message)
  }
}
