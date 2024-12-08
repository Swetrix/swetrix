import { put, call } from 'redux-saga/effects'

import UIActions from 'redux/reducers/ui'
import { isSelfhosted } from 'redux/constants'
import { IMetainfo } from 'redux/models/IMetainfo'
const { getPaymentMetainfo } = require('api')

export default function* loadMetainfo() {
  if (isSelfhosted) {
    return
  }

  try {
    const metainfo: IMetainfo = yield call(getPaymentMetainfo)

    yield put(UIActions.setMetainfo(metainfo))
  } catch (reason: unknown) {
    const { message } = reason as { message: string }
    // if (_isString(message)) {
    //   yield put(UIActions.setProjectsError(message))
    // }
    console.error('failed to load metainfo:', message)
  }
}
