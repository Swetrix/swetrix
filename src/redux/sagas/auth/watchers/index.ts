import { takeLatest, all, call } from 'redux-saga/effects'
import signIn from 'redux/sagas/auth/workers/signin'
import signUp from 'redux/sagas/auth/workers/signup'
import logout from 'redux/sagas/auth/workers/logout'
import verifyEmail from 'redux/sagas/auth/workers/verifyEmail'
import updateUserProfile from 'redux/sagas/auth/workers/updateUserProfile'
import deleteUserAccount from 'redux/sagas/auth/workers/deleteUserAccount'
import ssoAuth from 'redux/sagas/auth/workers/sso_auth'
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

export default function* watchAuth() {
  yield all([
    call(watchLogin), call(watchSignup), call(watchVerifyEmail),
    call(watchUpdateUserProfile), call(watchDeleteUserProfile),
    call(watchLogout), call(watchAuthSSO),
  ])
}
