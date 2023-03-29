/* eslint-disable no-unused-vars */
import types from 'redux/sagas/actions/types'
import { getRefreshToken, removeRefreshToken } from 'utils/refreshToken'
import { logoutApi } from 'api'
import { removeAccessToken } from 'utils/accessToken'
import { removeItem } from 'utils/localstorage'
import { LS_VIEW_PREFS_SETTING } from 'redux/constants'
import { IUser } from '../../models/IUser'

const loadProjects = (take?: number, skip?: number) => ({
  type: types.LOAD_PROJECTS,
  payload: { take, skip },
})

const loadSharedProjects = (take?: number, skip?: number) => ({
  type: types.LOAD_SHARED_PROJECTS,
  payload: { take, skip },
})

const loadProjectsCaptcha = (take?: number, skip?: number) => ({
  type: types.LOAD_PROJECTS,
  payload: { take, skip, isCaptcha: true },
})

const loadExtensions = () => ({
  type: types.LOAD_EXTENSIONS,
})

const loadProjectAlerts = (take?: number, skip?: number) => ({
  type: types.LOAD_PROJECT_ALERTS,
  payload: { take, skip },
})

const loginAsync = (credentials: {
    email: string,
    password: string,
}, callback = () => { }) => ({
  type: types.LOGIN_ASYNC,
  payload: {
    credentials, callback,
  },
})

const signupAsync = (data: {
    email: string,
    password: string,
}, t?: (string: string) => {}, callback = (res: any) => { }) => ({
  type: types.SIGNUP_ASYNC,
  payload: {
    data, callback, t,
  },
})

const emailVerifyAsync = (data: {
    id: string,
}, successfulCallback?: () => {}, errorCallback?: () => {}) => ({
  type: types.EMAIL_VERIFY_ASYNC,
  payload: { data, successfulCallback, errorCallback },
})

const updateUserProfileAsync = (data: IUser, callback = () => { }) => ({
  type: types.UPDATE_USER_PROFILE_ASYNC,
  payload: { data, callback },
})

const deleteAccountAsync = (errorCallback?: (e: string) => {}, successCallback?: (str: string) => {}, t?: (str: string) => {}) => {
  const refreshToken = getRefreshToken()
  logoutApi(refreshToken)

  return {
    type: types.DELETE_ACCOUNT_ASYNC,
    payload: {
      errorCallback, successCallback, t,
    },
  }
}

const shareVerifyAsync = (data: {
    id: string,
}, successfulCallback?: () => {}, errorCallback?: () => {}) => ({
  type: types.SHARE_VERIFY_ASYNC,
  payload: { data, successfulCallback, errorCallback },
})

const logout = (basedOn401Error: string) => {
  const refreshToken = getRefreshToken()
  logoutApi(refreshToken)
  removeAccessToken()
  removeRefreshToken()
  removeItem(LS_VIEW_PREFS_SETTING)

  return {
    type: types.LOGOUT,
    payload: { basedOn401Error },
  }
}

const sagaActions = {
  loadProjects,
  loadSharedProjects,
  loadProjectsCaptcha,
  loadExtensions,
  loadProjectAlerts,
  loginAsync,
  signupAsync,
  emailVerifyAsync,
  updateUserProfileAsync,
  deleteAccountAsync,
  logout,
  shareVerifyAsync,
}

export default sagaActions
