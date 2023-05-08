/* eslint-disable implicit-arrow-linebreak */
import axios, { AxiosResponse } from 'axios'
import createAuthRefreshInterceptor from 'axios-auth-refresh'
import { store } from 'redux/store'
import Debug from 'debug'
import _map from 'lodash/map'
import _isEmpty from 'lodash/isEmpty'
import _isArray from 'lodash/isArray'

import { authActions } from 'redux/reducers/auth'
import sagaActions from 'redux/sagas/actions'
import { getAccessToken, removeAccessToken, setAccessToken } from 'utils/accessToken'
import { getRefreshToken, removeRefreshToken } from 'utils/refreshToken'
import { DEFAULT_ALERTS_TAKE, isSelfhosted } from 'redux/constants'
import { IUser } from 'redux/models/IUser'
import { IAuth } from 'redux/models/IAuth'
import { IProject, IOverall, IProjectNames } from 'redux/models/IProject'
import { IAlerts } from 'redux/models/IAlerts'
import { ISharedProject } from 'redux/models/ISharedProject'
import { ISubscribers } from 'redux/models/ISubscribers'

const debug = Debug('swetrix:api')
// @ts-ignore
const baseURL: string = isSelfhosted ? window.env.API_URL : process.env.REACT_APP_API_URL

const api = axios.create({
  baseURL,
})

// Function that will be called to refresh authorization
const refreshAuthLogic = (failedRequest: { response: AxiosResponse }) =>
  axios
    .post(`${baseURL}v1/auth/refresh-token`, null, {
      headers: {
        Authorization: `Bearer ${getRefreshToken()}`,
      },
    })
    .then((tokenRefreshResponse) => {
      const { accessToken } = tokenRefreshResponse.data
      setAccessToken(accessToken)
      // eslint-disable-next-line
      failedRequest.response.config.headers.Authorization = `Bearer ${accessToken}`
      return Promise.resolve()
    })
    .catch((error) => {
      store.dispatch(authActions.logout())
      store.dispatch(sagaActions.logout(true))
      return Promise.reject(error)
    })

// Instantiate the interceptor
createAuthRefreshInterceptor(api, refreshAuthLogic, {
  statusCodes: [401, 403],
})

api.interceptors.request.use(
  (config) => {
    const token = getAccessToken()
    if (token) {
      // eslint-disable-next-line no-param-reassign
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

export const authMe = () =>
  api
    .get('user/me')
    .then((response): IUser => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message)
        ? error.response.data
        : error.response.data.message
    })

export const logoutApi = (refreshToken: string | null) =>
  axios
    .post(`${baseURL}v1/auth/logout`, null, {
      headers: {
        Authorization: `Bearer ${refreshToken}`,
      },
    })
    .then((response): {} => {
      removeAccessToken()
      removeRefreshToken()
      return response.data
    })
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message)
        ? error.response.data
        : error.response.data.message
    })

export const refreshToken = () =>
  api
    .post('v1/auth/refresh-token')
    .then((response): {
      access_token: string
      refreshToken: string
    } => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message)
        ? error.response.data
        : error.response.data.message
    })

export const login = (credentials: {
  email: string
  password: string
}) =>
  api
    .post('v1/auth/login', credentials)
    .then((response): IAuth => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message)
        ? error.response.data
        : error.response.data.message
    })

export const signup = (data: {
  email: string,
  password: string
  repeat: string
}) =>
  api
    .post('v1/auth/register', data)
    .then((response): IAuth => response.data)
    .catch((error) => {
      const errorsArray = error.response.data.message
      if (_isArray(errorsArray)) {
        throw errorsArray
      }
      throw new Error(errorsArray)
    })

export const deleteUser = () =>
  api
    .delete('/user')
    .then((response): {} => response.data)
    .catch((error) => {
      throw new Error(JSON.stringify(error.response.data))
    })

export const changeUserDetails = (data: IUser) =>
  api
    .put('/user', data)
    .then((response): IUser => response.data)
    .catch((error) => {
      const errorsArray = error.response.data.message
      if (_isArray(errorsArray)) {
        throw errorsArray
      }
      throw new Error(errorsArray)
    })

export const forgotPassword = (email: {
  email: string
}) =>
  api
    .post('v1/auth/reset-password', email)
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message)
        ? error.response.data
        : error.response.data.message
    })

export const confirmEmail = () =>
  api
    .post('/user/confirm_email')
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message)
        ? error.response.data
        : error.response.data.message
    })

export const exportUserData = () =>
  api
    .get('/user/export')
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message)
        ? error.response.data
        : error.response.data.message
    })

export const createNewPassword = (id: string, password: string) =>
  api
    .post(`v1/auth/reset-password/confirm/${id}`, { newPassword: password })
    .then((response) => response.data)
    .catch((error) => {
      const errorsArray = error.response.data.message
      if (_isArray(errorsArray)) {
        throw errorsArray
      }
      throw new Error(errorsArray)
    })

export const verifyEmail = ({ id }: { id: string }) =>
  api
    .get(`v1/auth/verify-email/${id}`)
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message)
        ? error.response.data
        : error.response.data.message
    })

export const verifyShare = ({ path, id }: { path: string, id: string }) =>
  api
    .get(`/project/${path}/${id}`)
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message)
        ? error.response.data
        : error.response.data.message
    })

export const getProjects = (take: number = 0, skip: number = 0, isCaptcha: boolean = false) =>
  api
    .get(`/project?take=${take}&skip=${skip}&isCaptcha=${isCaptcha}`)
    .then((response): {
      results: IProject[]
      total: number
      page_total: number
      totalMonthlyEvents: number
    } => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message)
        ? error.response.data
        : error.response.data.message
    })

export const getSharedProjects = (take: number = 0, skip: number = 0) =>
  api
    .get(`/project/shared?take=${take}&skip=${skip}`)
    .then((response): {
      results: ISharedProject[]
      total: number
      page_total: number
    } => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message)
        ? error.response.data
        : error.response.data.message
    })

export const getProject = (pid: string, isCaptcha: boolean = false) =>
  api
    .get(`/project/${pid}?isCaptcha=${isCaptcha}`)
    .then((response): IProject => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message)
        ? error.response.data
        : error.response.data.message
    })

export const createProject = (data: {
  id: string
  name: string
  isCaptcha?: boolean
}) =>
  api
    .post('/project', data)
    .then((response): IProject => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message)
        ? error.response.data
        : error.response.data.message
    })

export const updateProject = (id: string, data: Partial<IProject>) =>
  api
    .put(`/project/${id}`, data)
    .then((response): IProject => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message)
        ? error.response.data
        : error.response.data.message
    })

export const deleteProject = (id: string) =>
  api
    .delete(`/project/${id}`)
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message)
        ? error.response.data
        : error.response.data.message
    })

export const deleteCaptchaProject = (id: string) =>
  api
    .delete(`project/captcha/${id}`)
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message)
        ? error.response.data
        : error.response.data.message
    })

export const resetProject = (id: string) =>
  api
    .delete(`/project/reset/${id}`)
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message)
        ? error.response.data
        : error.response.data.message
    })

export const resetCaptchaProject = (id: string) =>
  api
    .delete(`project/captcha/reset/${id}`)
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message)
        ? error.response.data
        : error.response.data.message
    })

export const getProjectData = (
  pid: string,
  tb: string = 'hour',
  period: string = '3d',
  filters: string[] = [],
  from: string = '',
  to: string = '',
  timezone: string = '',
) =>
  api
    .get(
      `log?pid=${pid}&timeBucket=${tb}&period=${period}&filters=${JSON.stringify(filters)}&from=${from}&to=${to}&timezone=${timezone}`,
    )
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message)
        ? error.response.data
        : error.response.data.message
    })

export const getProjectCompareData = (
  pid: string,
  tb: string = 'hour',
  period: string = '3d',
  filters: string[] = [],
  from: string = '',
  to: string = '',
  timezone: string = '',
) =>
  api
    .get(
      `log/chart?pid=${pid}&timeBucket=${tb}&period=${period}&filters=${JSON.stringify(filters)}&from=${from}&to=${to}&timezone=${timezone}`,
    )
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message)
        ? error.response.data
        : error.response.data.message
    })

export const getPerfData = (
  pid: string,
  tb: string = 'hour',
  period: string = '3d',
  filters: string[] = [],
  from: string = '',
  to: string = '',
  timezone: string = '',
) =>
  api
    .get(
      `log/performance?pid=${pid}&timeBucket=${tb}&period=${period}&filters=${JSON.stringify(filters)}&from=${from}&to=${to}&timezone=${timezone}`,
    )
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message)
        ? error.response.data
        : error.response.data.message
    })

export const getCaptchaData = (
  pid: string,
  tb: string = 'hour',
  period: string = '3d',
  filters: string[] = [],
  from: string = '',
  to: string = '',
) =>
  api
    .get(
      `log/captcha?pid=${pid}&timeBucket=${tb}&period=${period}&filters=${JSON.stringify(filters)}&from=${from}&to=${to}`,
    )
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message)
        ? error.response.data
        : error.response.data.message
    })

export const getOverallStats = (pids: string[]) =>
  api
    .get(`log/birdseye?pids=[${_map(pids, (pid) => `"${pid}"`).join(',')}]`)
    .then((response): IOverall => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message)
        ? error.response.data
        : error.response.data.message
    })

export const getOverallStatsCaptcha = (pids: string[]) =>
  api
    .get(`log/captcha/birdseye?pids=[${_map(pids, (pid) => `"${pid}"`).join(',')}]`)
    .then((response): IOverall => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message)
        ? error.response.data
        : error.response.data.message
    })

export const getLiveVisitors = (pids: string[]) =>
  api
    .get(`log/hb?pids=[${_map(pids, (pid) => `"${pid}"`).join(',')}]`)
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message)
        ? error.response.data
        : error.response.data.message
    })

export const getGeneralStats = () =>
  api
    .get('log/generalStats')
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message)
        ? error.response.data
        : error.response.data.message
    })

export const shareProject = (pid: string, data: {
  email: string
  role: string
}) =>
  api
    .post(`/project/${pid}/share`, data)
    .then((response): IProject => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message)
        ? error.response.data
        : error.response.data.message
    })

export const deleteShareProjectUsers = (pid: string, userId: string) =>
  api
    .delete(`/project/${pid}/${userId}`)
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message)
        ? error.response.data
        : error.response.data.message
    })

export const deleteShareProject = (pid: string) =>
  api
    .delete(`user/share/${pid}`)
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message)
        ? error.response.data
        : error.response.data.message
    })

export const acceptShareProject = (id: string) =>
  api
    .get(`user/share/${id}`)
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message)
        ? error.response.data
        : error.response.data.message
    })

export const changeShareRole = (id: string, data: {
  role: string
}) =>
  api
    .put(`project/share/${id}`, data)
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message)
        ? error.response.data
        : error.response.data.message
    })

export const generate2FA = () =>
  api
    .post('2fa/generate')
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message)
        ? error.response.data
        : error.response.data.message
    })

export const enable2FA = (twoFactorAuthenticationCode: string) =>
  api
    .post('2fa/enable', { twoFactorAuthenticationCode })
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message)
        ? error.response.data
        : error.response.data.message
    })

export const disable2FA = (twoFactorAuthenticationCode: string) =>
  api
    .post('2fa/disable', { twoFactorAuthenticationCode })
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message)
        ? error.response.data
        : error.response.data.message
    })

export const submit2FA = (twoFactorAuthenticationCode: string) =>
  api
    .post('2fa/authenticate', { twoFactorAuthenticationCode })
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message)
        ? error.response.data
        : error.response.data.message
    })

export const generateApiKey = () =>
  api
    .post('user/api-key')
    .then((response): {
      apiKey: string
    } => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message)
        ? error.response.data
        : error.response.data.message
    })

export const deleteApiKey = () =>
  api
    .delete('user/api-key')
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message)
        ? error.response.data
        : error.response.data.message
    })

export const getInstalledExtensions = (limit = 100, offset = 0) =>
  api
    .get(`/extensions/installed?limit=${limit}&offset=${offset}`)
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message)
        ? error.response.data
        : error.response.data.message
    })

export const setTheme = (theme: string) =>
  api
    .put('user/theme', { theme })
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message)
        ? error.response.data
        : error.response.data.message
    })

export interface IGetLiveVisitorsInfo {
  dv: string
  br: string
  os: string
  cc: string
}

export const getLiveVisitorsInfo = (pid: string) =>
  api
    .get(`log/liveVisitors?pid=${pid}`)
    .then((response): IGetLiveVisitorsInfo[] => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message)
        ? error.response.data
        : error.response.data.message
    })

export const removeTgIntegration = (tgID: string) =>
  api
    .delete(`user/tg/${tgID}`)
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message)
        ? error.response.data
        : error.response.data.message
    })

export const getAlerts = (take: number = DEFAULT_ALERTS_TAKE, skip: number = 0) =>
  api
    .get(`alert?take=${take}&skip=${skip}`)
    .then((response): {
      results: IAlerts[]
      total: number
      page_total: number
    } => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message)
        ? error.response.data
        : error.response.data.message
    })

export interface ICreateAlert extends Omit<IAlerts, 'id' | 'lastTrigger' | 'lastTriggered' | 'created'> { }

export const createAlert = (data: ICreateAlert) =>
  api
    .post('alert', data)
    .then((response): IAlerts => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message)
        ? error.response.data
        : error.response.data.message
    })

export const updateAlert = (id: string, data: Partial<IAlerts>) =>
  api
    .put(`alert/${id}`, data)
    .then((response): IAlerts => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message)
        ? error.response.data
        : error.response.data.message
    })

export const deleteAlert = (id: string) =>
  api
    .delete(`alert/${id}`)
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message)
        ? error.response.data
        : error.response.data.message
    })

export const reGenerateCaptchaSecretKey = (pid: string) =>
  api
    .post(`project/secret-gen/${pid}`)
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message)
        ? error.response.data
        : error.response.data.message
    })

export const addSubscriber = (id: string, data: {
  email: string
  reportFrequency: string
}) =>
  api
    .post(`project/${id}/subscribers`, data)
    .then((response): ISubscribers => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message)
        ? error.response.data
        : error.response.data.message
    })

export const getSubscribers = (id: string, offset: number, limit: number) =>
  api
    .get(`project/${id}/subscribers?offset=${offset}&limit=${limit}`)
    .then((response): {
      subscribers: ISubscribers[]
      count: number
    } => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message)
        ? error.response.data
        : error.response.data.message
    })

export const updateSubscriber = (id: string, subscriberId: string, data: {
  reportFrequency: string
}) =>
  api
    .patch(`project/${id}/subscribers/${subscriberId}`, data)
    .then((response): ISubscribers => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message)
        ? error.response.data
        : error.response.data.message
    })

export const removeSubscriber = (id: string, subscriberId: string) =>
  api
    .delete(`project/${id}/subscribers/${subscriberId}`)
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message)
        ? error.response.data
        : error.response.data.message
    })

export const confirmSubscriberInvite = (id: string, token: string) =>
  api
    .get(`project/${id}/subscribers/invite?token=${token}`)
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message)
        ? error.response.data
        : error.response.data.message
    })

export const getProjectDataCustomEvents = (
  pid: string,
  tb: string = 'hour',
  period: string = '3d',
  filters: string[] = [],
  from: string = '',
  to: string = '',
  timezone: string = '',
  customEvents: string[] = [],
) =>
  api
    .get(
      `log/custom-events?pid=${pid}&timeBucket=${tb}&period=${period}&filters=${JSON.stringify(filters)}&from=${from}&to=${to}&timezone=${timezone}&customEvents=${JSON.stringify(customEvents)}`,
    )
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message)
        ? error.response.data
        : error.response.data.message
    })

export const transferProject = (uuid: string, email: string) =>
  api
    .post('project/transfer', {
      projectId: uuid,
      email,
    })
    .then((response): unknown => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message)
        ? error.response.data
        : error.response.data.message
    })

export const rejectTransferProject = (uuid: string) =>
  api
    .delete(`project/transfer?token=${uuid}`)
    .then((response): unknown => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message)
        ? error.response.data
        : error.response.data.message
    })

export const confirmTransferProject = (uuid: string) =>
  api
    .get(`project/transfer?token=${uuid}`)
    .then((response): unknown => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message)
        ? error.response.data
        : error.response.data.message
    })

export const generateSSOAuthURL = (provider: string) =>
  api
    .post('v1/auth/sso/generate', {
      provider,
    })
    .then((response): unknown => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message)
        ? error.response.data
        : error.response.data.message
    })

export const getJWTBySSOHash = (hash: string, provider: string) =>
  api
    .post('v1/auth/sso/hash', { hash, provider })
    .then((response): unknown => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message)
        ? error.response.data
        : error.response.data.message
    })

export const linkBySSOHash = (hash: string, provider: string) =>
  api
    .post('v1/auth/sso/link_by_hash', { hash, provider })
    .then((response): unknown => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message)
        ? error.response.data
        : error.response.data.message
    })

export const unlinkSSO = (provider: string) =>
  api
    .delete('v1/auth/sso/unlink', { data: { provider } })
    .then((response): unknown => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message)
        ? error.response.data
        : error.response.data.message
    })

export const processSSOToken = (token: string, hash: string) =>
  api
    .post('v1/auth/sso/process-token', { token, hash })
    .then((response): unknown => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message)
        ? error.response.data
        : error.response.data.message
    })

export const getProjectsNames = () =>
  api
    .get('project/names')
    .then((response): IProjectNames[] => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message)
        ? error.response.data
        : error.response.data.message
    })

export const createCaptchaInherited = (id: string) =>
  api
    .put(`project/captcha/inherited/${id}`)
    .then((response): IProject => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message)
        ? error.response.data
        : error.response.data.message
    })

export const deletePartially = (id: string, data: {
  from: string
  to: string
}) =>
  api
    .delete(`project/partially/${id}?from=${data.from}&to=${data.to}`)
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message)
        ? error.response.data
        : error.response.data.message
    })

export const getUserFlow = (
  pid: string,
  tb: string = 'hour',
  period: string = '3d',
  from: string = '',
  to: string = '',
  timezone: string = '',
) =>
  api
    .get(
      `log/user-flow?pid=${pid}&timeBucket=${tb}&period=${period}&from=${from}&to=${to}&timezone=${timezone}`,
    )
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message)
        ? error.response.data
        : error.response.data.message
    })
