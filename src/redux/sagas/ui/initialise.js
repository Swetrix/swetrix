import { put, call, delay } from 'redux-saga/effects'
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
    }

    const lastBlogPost = yield call(getLastPost)
    yield delay(2000)
    yield put(UIActions.setLastBlogPost(lastBlogPost))
  } catch (e) {
    debug('An error occured whilst initialising: %s', e)
  }
}
