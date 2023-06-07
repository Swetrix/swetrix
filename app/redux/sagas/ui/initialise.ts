import { put, call } from 'redux-saga/effects'
import Debug from 'debug'

import { getAccessToken } from 'utils/accessToken'
import { getRefreshToken } from 'utils/refreshToken'
import { getLastPost } from 'api/blog'
import UIActions from 'redux/reducers/ui'
import { isSelfhosted } from 'redux/constants'
import sagaActions from '../actions'

const debug = Debug('swetrix:rx:s:initialise')

export default function* initialise() {
  try {
    const token: string = yield call(getAccessToken)
    const refreshToken: string = yield call(getRefreshToken)

    if (token && refreshToken) {
      yield put(sagaActions.loadProjects())
      yield put(sagaActions.loadSharedProjects())
      yield put(sagaActions.loadProjectsCaptcha())
      yield put(sagaActions.loadExtensions())
      yield put(sagaActions.loadProjectAlerts())
    }

    if (!isSelfhosted) {
      yield put(sagaActions.loadMetainfo())

      const lastBlogPost: {
        title: string,
        url_path: string,
      } = yield call(getLastPost)
      yield put(UIActions.setLastBlogPost(lastBlogPost))
    }
  } catch (e) {
    debug('An error occured whilst initialising: %s', e)
  }
}
