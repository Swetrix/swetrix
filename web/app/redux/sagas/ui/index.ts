import { takeEvery, fork, takeLatest } from 'redux-saga/effects'
import sagaTypes from '../actions/types'
import initialise from './initialise'
import generalStats from './worker_general_stats'
import isEventsAvailable from './worker_is_events_available'
import shareVerify from './share_verify'
import loadExtensions from './load_extensions'
import loadMetainfo from './load_metainfo'
import loadUsageinfo from './load_usageinfo'
import loadMonitors from './load_monitors'

function* mainUISaga() {
  yield fork(initialise)
  yield fork(isEventsAvailable)
  yield fork(generalStats)
  yield takeEvery(sagaTypes.LOAD_METAINFO, loadMetainfo)
  yield takeEvery(sagaTypes.LOAD_USAGEINFO, loadUsageinfo)
  yield takeEvery(sagaTypes.LOAD_EXTENSIONS, loadExtensions)
  // @ts-expect-error
  yield takeLatest(sagaTypes.SHARE_VERIFY_ASYNC, shareVerify)
  // @ts-expect-error
  yield takeLatest(sagaTypes.LOAD_MONITORS, loadMonitors)
}

export default mainUISaga
