import { put, call } from 'redux-saga/effects'
import Debug from 'debug'

import { getAccessToken } from 'utils/accessToken'
import UIActions from 'redux/actions/ui'

const debug = Debug('swetrix:rx:s:initialise')

export default function* initialise() {
  try {
    const token = yield call(getAccessToken)

    if (token) {
      yield put(UIActions.loadProjects())
    }
  } catch (e) {
    debug('An error occured whilst initialising: %s', e)
  }
}
