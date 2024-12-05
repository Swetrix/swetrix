import { put, call } from 'redux-saga/effects'

import { getAccessToken } from 'utils/accessToken'
import { getRefreshToken } from 'utils/refreshToken'
import UIActions from 'redux/reducers/ui'
import { isSelfhosted } from 'redux/constants'
import sagaActions from '../actions'
const { getLastPost } = require('api')

export default function* initialise() {
  try {
    const token: string = yield call(getAccessToken)
    const refreshToken: string = yield call(getRefreshToken)

    if (token && refreshToken) {
      yield put(sagaActions.loadProjects())
      yield put(sagaActions.loadExtensions())
      yield put(sagaActions.loadProjectAlerts())
      yield put(sagaActions.loadMonitors())
    }

    if (!isSelfhosted) {
      yield put(sagaActions.loadMetainfo())

      const lastBlogPost: {
        title: string
        handle: string
      } = yield call(getLastPost)
      yield put(UIActions.setLastBlogPost(lastBlogPost))
    }
  } catch (reason) {
    console.error('An error occured whilst initialising:', reason)
  }
}
