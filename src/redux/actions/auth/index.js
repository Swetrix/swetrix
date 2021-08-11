import { removeItem } from 'utils/localstorage'
import { types } from './types'

export const authActions = {
  // Synchronous
  loginSuccess(user) {
    return {
      type: types.LOGIN_SUCCESSFUL,
      payload: { user }
    }
  },

  emailVerifySuccess() {
    return {
      type: types.EMAIL_VERIFY_SUCCESSFUL
    }
  },

  signupSuccess(user) {
    return {
      type: types.SIGNUP_UP_SUCCESSFUL,
      payload: { user }
    }
  },

  updateProfileSuccess(user) {
    return {
      type: types.UPDATE_USER_PROFILE_SUCCESS,
      payload: { user }
    }
  },

  logout() {
    removeItem('access_token')
    removeItem('user_info')

    return {
      type: types.LOGOUT
    }
  },

  clearErrors() {
    return {
      type: types.CLEAR_ERRORS
    }
  },

  savePath(path) {
    return {
      type: types.SAVE_PATH,
      payload: { path }
    }
  },

  deleteAccountSuccess() {
    removeItem('access_token')
    removeItem('user_info')

    return {
      type: types.DELETE_ACCOUNT_SUCCESS
    }
  },

  finishLoading() {
    return {
      type: types.FINISH_LOADING
    }
  },

  // Asynchronous
  loginAsync(credentials, callback = () => { }) {
    return {
      type: types.LOGIN_ASYNC,
      payload: {
        credentials, callback,
      },
    }
  },

  signupAsync(data, callback = () => { }) {
    return {
      type: types.SIGNUP_ASYNC,
      payload: {
        data, callback,
      },
    }
  },

  emailVerifyAsync(data, successfulCallback, errorCallback) {
    return {
      type: types.EMAIL_VERIFY_ASYNC,
      payload: { data, successfulCallback, errorCallback }
    }
  },

  updateUserProfileAsync(data, successfulCallback = () => { }) {
    return {
      type: types.UPDATE_USER_PROFILE_ASYNC,
      payload: { data, successfulCallback }
    }
  },

  deleteAccountAsync(errorCallback) {
    return {
      type: types.DELETE_ACCOUNT_ASYNC,
      payload: { errorCallback }
    }
  }
}
