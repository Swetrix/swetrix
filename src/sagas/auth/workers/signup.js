import { call, put  } from 'redux-saga/effects'
import { authActions } from 'actions/auth'
import { errorsActions } from 'actions/errors'
import { setAccessToken } from "utils/accessToken"
import { signup } from 'api'

export default function* ({ payload: { data, resetRecaptcha = () => {} } }) {
	try {
		const response = yield call(signup, data)

		yield put(authActions.signupSuccess(response.user))
		yield call(setAccessToken, JSON.stringify(response.access_token))
	} catch (error) {
		yield put(errorsActions.signupFailed(error.message || (typeof error === 'string' ? error : error[0])))
		resetRecaptcha()
	} finally {
		yield put(authActions.finishLoading())
	}
}
