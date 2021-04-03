import { takeLatest, all, call } from 'redux-saga/effects'
import { types } from 'actions/auth/types'
import signIn from 'sagas/auth/workers/signin'
import signUp from 'sagas/auth/workers/signup'
import verifyEmail from 'sagas/auth/workers/verifyEmail'
import updateUserProfile from 'sagas/auth/workers/updateUserProfile'
import deleteUserAccount from "sagas/auth/workers/deleteUserAccount"

function* watchLogin() {
	yield takeLatest(types.LOGIN_ASYNC, signIn)
}

function* watchVerifyEmail() {
	yield takeLatest(types.EMAIL_VERIFY_ASYNC, verifyEmail)
}

function* watchSignup() {
	yield takeLatest(types.SIGNUP_ASYNC, signUp)
}

function* watchUpdateUserProfile() {
	yield takeLatest(types.UPDATE_USER_PROFILE_ASYNC, updateUserProfile)
}

function* watchDeleteUserProfile() {
	yield takeLatest(types.DELETE_ACCOUNT_ASYNC, deleteUserAccount)
}

export default function* watchAuth() {
	yield all([call(watchLogin), call(watchSignup), call(watchVerifyEmail), call(watchUpdateUserProfile), call(watchDeleteUserProfile)])
}
