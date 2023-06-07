import { takeLatest, all, call } from 'redux-saga/effects'
import signIn from '../workers/signin'
import signUp from '../workers/signup'
import logout from '../workers/logout'
import verifyEmail from '../workers/verifyEmail'
import updateUserProfile from '../workers/updateUserProfile'
import deleteUserAccount from '../workers/deleteUserAccount'
import ssoAuth from '../workers/sso_auth'
import ssoLink from '../workers/sso_link'
import ssoUnlink from '../workers/sso_unlink'
import updateShowLiveVisitorsInTitle from '../workers/update_show_live_visitors_in_title'
import sagaTypes from '../../actions/types'

function* watchLogin() {
  // @ts-ignore
  yield takeLatest(sagaTypes.LOGIN_ASYNC, signIn)
}

function* watchVerifyEmail() {
  // @ts-ignore
  yield takeLatest(sagaTypes.EMAIL_VERIFY_ASYNC, verifyEmail)
}

function* watchSignup() {
  // @ts-ignore
  yield takeLatest(sagaTypes.SIGNUP_ASYNC, signUp)
}

function* watchLogout() {
  // @ts-ignore
  yield takeLatest(sagaTypes.LOGOUT, logout)
}

function* watchUpdateUserProfile() {
  // @ts-ignore
  yield takeLatest(sagaTypes.UPDATE_USER_PROFILE_ASYNC, updateUserProfile)
}

function* watchDeleteUserProfile() {
  // @ts-ignore
  yield takeLatest(sagaTypes.DELETE_ACCOUNT_ASYNC, deleteUserAccount)
}

function* watchAuthSSO() {
  // @ts-ignore
  yield takeLatest(sagaTypes.AUTH_SSO, ssoAuth)
}

function* watchLinkSSO() {
  // @ts-ignore
  yield takeLatest(sagaTypes.LINK_SSO, ssoLink)
}

function* watchUnlinkSSO() {
  // @ts-ignore
  yield takeLatest(sagaTypes.UNLINK_SSO, ssoUnlink)
}

function* watchUpdateShowLiveVisitorsInTitle() {
  // @ts-ignore
  yield takeLatest(sagaTypes.UPDATE_SHOW_LIVE_VISITORS_IN_TITLE, updateShowLiveVisitorsInTitle)
}

export default function* watchAuth() {
  yield all([
    call(watchLogin), call(watchSignup), call(watchVerifyEmail),
    call(watchUpdateUserProfile), call(watchDeleteUserProfile),
    call(watchLogout), call(watchAuthSSO), call(watchLinkSSO),
    call(watchUnlinkSSO), call(watchUpdateShowLiveVisitorsInTitle),
  ])
}
