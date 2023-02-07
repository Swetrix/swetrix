import { removeItem } from 'utils/localstorage'
import { removeAccessToken } from 'utils/accessToken'
import { removeRefreshToken } from 'utils/refreshToken'
import { LS_VIEW_PREFS_SETTING } from 'redux/constants'
import { types } from './types'

export const authActions = {
  loginSuccess(user) {
    return {
      type: types.LOGIN_SUCCESSFUL,
      payload: { user },
    }
  },

  emailVerifySuccess() {
    return {
      type: types.EMAIL_VERIFY_SUCCESSFUL,
    }
  },

  signupSuccess(user) {
    return {
      type: types.SIGNUP_UP_SUCCESSFUL,
      payload: { user },
    }
  },

  updateProfileSuccess(user) {
    return {
      type: types.UPDATE_USER_PROFILE_SUCCESS,
      payload: { user },
    }
  },

  logout(basedOn401Error) {
    removeAccessToken()
    removeRefreshToken()
    removeItem(LS_VIEW_PREFS_SETTING)

    return {
      type: types.LOGOUT,
      payload: { basedOn401Error },
    }
  },

  clearErrors() {
    return {
      type: types.CLEAR_ERRORS,
    }
  },

  savePath(path) {
    return {
      type: types.SAVE_PATH,
      payload: { path },
    }
  },

  setDontRemember(dontRemember) {
    return {
      type: types.SET_DONT_REMEMBER,
      payload: { dontRemember },
    }
  },

  updateUserData(data) {
    return {
      type: types.UPDATE_USER_DATA,
      payload: { data },
    }
  },

  deleteAccountSuccess() {
    removeAccessToken()
    removeItem('user_info')

    return {
      type: types.DELETE_ACCOUNT_SUCCESS,
    }
  },

  finishLoading() {
    return {
      type: types.FINISH_LOADING,
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

  signupAsync(data, t, callback = () => { }) {
    return {
      type: types.SIGNUP_ASYNC,
      payload: {
        data, callback, t,
      },
    }
  },

  emailVerifyAsync(data, successfulCallback, errorCallback) {
    return {
      type: types.EMAIL_VERIFY_ASYNC,
      payload: { data, successfulCallback, errorCallback },
    }
  },

  updateUserProfileAsync(data, callback = () => { }) {
    return {
      type: types.UPDATE_USER_PROFILE_ASYNC,
      payload: { data, callback },
    }
  },

  deleteAccountAsync(errorCallback, successCallback, t) {
    return {
      type: types.DELETE_ACCOUNT_ASYNC,
      payload: {
        errorCallback, successCallback, t,
      },
    }
  },

  deleteShareProject(id) {
    return {
      type: types.DELETE_SHARE_PROJECT,
      payload: { id },
    }
  },

  setUserShareData(data, id) {
    return {
      type: types.SET_USER_SHARE_DATA,
      payload: { data, id },
    }
  },

  setApiKey(apiKey) {
    return {
      type: types.SET_API_KEY,
      payload: { apiKey },
    }
  },
}
