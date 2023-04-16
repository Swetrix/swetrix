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
  dontRemember: boolean,
}, callback = () => { }) => ({
  type: types.LOGIN_ASYNC,
  payload: {
    credentials, callback,
  },
})

// currently only google is supported, in future we should provide a variable specifying the provider
const authSSO = (dontRemember: boolean, t: (key: string) => string = () => '', callback: (res: any) => void = () => { }) => ({
  type: types.AUTH_SSO,
  payload: {
    dontRemember, callback, t,
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
}, successfulCallback?: () => void, errorCallback?: (e: string) => void) => ({
  type: types.EMAIL_VERIFY_ASYNC,
  payload: { data, successfulCallback, errorCallback },
})

const updateUserProfileAsync = (data: Partial<IUser>, callback = (item: any) => { }) => ({
  type: types.UPDATE_USER_PROFILE_ASYNC,
  payload: { data, callback },
})

const deleteAccountAsync = (errorCallback?: (e: string) => {}, successCallback?: (str?: string) => void, t?: (str: string) => {}) => {
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
  path: string
}, successfulCallback?: () => void, errorCallback?: (error: string) => void) => ({
  type: types.SHARE_VERIFY_ASYNC,
  payload: { data, successfulCallback, errorCallback },
})

const logout = (basedOn401Error: boolean) => {
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
  authSSO,
  signupAsync,
  emailVerifyAsync,
  updateUserProfileAsync,
  deleteAccountAsync,
  logout,
  shareVerifyAsync,
}

export default sagaActions
