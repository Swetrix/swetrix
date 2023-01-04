import { put, call } from 'redux-saga/effects'
import Debug from 'debug'

import { getAccessToken } from 'utils/accessToken'
import { getLastPost } from 'api/blog'
import UIActions from 'redux/actions/ui'

const debug = Debug('swetrix:rx:s:initialise')

export default function* initialise() {
  try {
    const token = yield call(getAccessToken)

    if (token) {
      yield put(UIActions.loadProjects())
      yield put(UIActions.loadSharedProjects())
      yield put(UIActions.loadExtensions())
      yield put(UIActions.loadProjectAlerts())
    }

    const lastBlogPost = yield call(getLastPost)
    yield put(UIActions.setLastBlogPost(lastBlogPost))
  } catch (e) {
    debug('An error occured whilst initialising: %s', e)
  }
}
