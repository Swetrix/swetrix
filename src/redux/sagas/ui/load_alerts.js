import { put, call } from 'redux-saga/effects'
import Debug from 'debug'
import _isString from 'lodash/isString'
import UIActions from 'redux/actions/ui'
import { errorsActions } from 'redux/actions/errors'
import { DEFAULT_ALERTS_TAKE } from 'redux/constants'
import { getAlerts } from 'api'

const debug = Debug('swetrix:rx:s:load-extensions')

export default function* loadProjectAlerts({ payload: { take = DEFAULT_ALERTS_TAKE, skip = 0 } }) {
  try {
    yield put(UIActions.setProjectAlertsLoading(true))
    const { results, total, page_total: pageTotal } = yield call(getAlerts, take, skip)

    yield put(UIActions.setProjectAlerts(results))
    yield put(UIActions.setProjectAlertsTotal(total, pageTotal))
  } catch ({ message }) {
    if (_isString(message)) {
      yield put(errorsActions.setError(message))
    }
    debug('failed to load extensions: %s', message)
  } finally {
    yield put(UIActions.setProjectAlertsLoading(false))
  }
}
