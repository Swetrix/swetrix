import { put, call } from 'redux-saga/effects'
import { toast } from 'sonner'
import _isString from 'lodash/isString'
import UIActions from 'redux/reducers/ui'
import { DEFAULT_MONITORS_TAKE, isSelfhosted } from 'redux/constants'
const { getAllMonitors } = require('api')

export default function* loadMonitors({ payload: { take = DEFAULT_MONITORS_TAKE, skip = 0 } }) {
  if (isSelfhosted) {
    yield put(UIActions.setMonitorsLoading(false))
    return
  }

  try {
    yield put(UIActions.setMonitorsLoading(true))
    const { results, total, page_total: pageTotal } = yield call(getAllMonitors, take, skip)

    yield put(UIActions.setMonitors(results))
    yield put(
      UIActions.setMonitorsTotal({
        total,
        pageTotal,
      }),
    )
  } catch (e: unknown) {
    const { message } = e as { message: string }
    if (_isString(message)) {
      toast.error(message)
    }
  } finally {
    yield put(UIActions.setMonitorsLoading(false))
  }
}
