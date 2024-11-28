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
import { DEFAULT_ALERTS_TAKE, API_URL, DEFAULT_MONITORS_TAKE } from 'redux/constants'
import { IUser } from 'redux/models/IUser'
import { IAuth } from 'redux/models/IAuth'
import { IProject, IOverall } from 'redux/models/IProject'
import { IAlerts } from 'redux/models/IAlerts'
import { ISharedProject } from 'redux/models/ISharedProject'
import { ISubscribers } from 'redux/models/ISubscribers'
import { IFilter, IProjectViewCustomEvent } from 'pages/Project/View/interfaces/traffic'
import { AIResponse } from 'pages/Project/View/interfaces/ai'
import { Monitor, MonitorOverall } from 'redux/models/Uptime'

const debug = Debug('swetrix:api')

export const api = axios.create({
  baseURL: API_URL,
})

// Function that will be called to refresh authorization
const refreshAuthLogic = (failedRequest: { response: AxiosResponse }) =>
  axios
    .post(`${API_URL}v1/auth/refresh-token`, null, {
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
      store.dispatch(sagaActions.logout(true, false))
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
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const logoutApi = (refreshToken: string | null) =>
  axios
    .post(`${API_URL}v1/auth/logout`, null, {
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
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const logoutAllApi = () =>
  api
    .post(`${API_URL}v1/auth/logout-all`)
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw new Error(error.respon)
    })

export const login = (credentials: { email: string; password: string }) =>
  api
    .post('v1/auth/login', credentials)
    .then((response): IAuth => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const signup = (data: { email: string; password: string; refCode?: string }) =>
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

export const deleteUser = (deletionFeedback?: string) =>
  api
    .delete('/user', {
      data: {
        feedback: deletionFeedback,
      },
    })
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

export const setShowLiveVisitorsInTitle = (show: boolean) =>
  api
    .put('/user/live-visitors', { show })
    .then((response): Partial<IUser> => response.data)
    .catch((error) => {
      const errorsArray = error.response.data.message
      if (_isArray(errorsArray)) {
        throw errorsArray
      }
      throw new Error(errorsArray)
    })

export const generateRefCode = () =>
  api
    .post('/user/generate-ref-code')
    .then((response): Partial<IUser> => response.data)
    .catch((error) => {
      const errorsArray = error.response.data.message
      if (_isArray(errorsArray)) {
        throw errorsArray
      }
      throw new Error(errorsArray)
    })

export const getPayoutsInfo = () =>
  api
    .get('/user/payouts/info')
    .then((response): Partial<IUser> => response.data)
    .catch((error) => {
      const errorsArray = error.response.data.message
      if (_isArray(errorsArray)) {
        throw errorsArray
      }
      throw new Error(errorsArray)
    })

export const getReferrals = () =>
  api
    .get('/user/referrals')
    .then((response): Partial<IUser> => response.data)
    .catch((error) => {
      const errorsArray = error.response.data.message
      if (_isArray(errorsArray)) {
        throw errorsArray
      }
      throw new Error(errorsArray)
    })

export const forgotPassword = (email: { email: string }) =>
  api
    .post('v1/auth/reset-password', email)
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const confirmEmail = () =>
  api
    .post('/user/confirm_email')
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const exportUserData = () =>
  api
    .get('/user/export')
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
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
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const confirmChangeEmail = ({ id }: { id: string }) =>
  api
    .get(`v1/auth/change-email/confirm/${id}`)
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const verifyShare = ({ path, id }: { path: string; id: string }) =>
  api
    .get(`/project/${path}/${id}`)
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getProjects = (take: number = 0, skip: number = 0, isCaptcha: boolean = false, search?: string) =>
  api
    .get(`/project?take=${take}&skip=${skip}&isCaptcha=${isCaptcha}&search=${search}`)
    .then(
      (
        response,
      ): {
        results: IProject[]
        total: number
        page_total: number
        totalMonthlyEvents: number
      } => response.data,
    )
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getSharedProjects = (take: number = 0, skip: number = 0, search?: string) =>
  api
    .get(`/project/shared?take=${take}&skip=${skip}&search=${search}`)
    .then(
      (
        response,
      ): {
        results: ISharedProject[]
        total: number
        page_total: number
      } => response.data,
    )
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

// eslint-disable-next-line default-param-last
export const getProject = (pid: string, isCaptcha: boolean = false, password?: string) =>
  api
    .get(`/project/${pid}?isCaptcha=${isCaptcha}`, {
      headers: {
        'x-password': password,
      },
    })
    .then((response): IProject => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const createProject = (data: { name: string; isCaptcha?: boolean }) =>
  api
    .post('/project', data)
    .then((response): IProject => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const updateProject = (id: string, data: Partial<IProject>) =>
  api
    .put(`/project/${id}`, data)
    .then((response): IProject => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const deleteProject = (id: string) =>
  api
    .delete(`/project/${id}`)
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const deleteCaptchaProject = (id: string) =>
  api
    .delete(`project/captcha/${id}`)
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const resetProject = (id: string) =>
  api
    .delete(`/project/reset/${id}`)
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const resetCaptchaProject = (id: string) =>
  api
    .delete(`project/captcha/reset/${id}`)
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getProjectData = (
  pid: string,
  tb: string = 'hour',
  period: string = '1d',
  filters: IFilter[] = [],
  metrics: IProjectViewCustomEvent[] = [],
  from: string = '',
  to: string = '',
  timezone: string = '',
  password: string | undefined = '',
  mode: 'periodical' | 'cumulative' = 'periodical',
) =>
  api
    .get(
      `log?pid=${pid}&timeBucket=${tb}&period=${period}&metrics=${JSON.stringify(metrics)}&filters=${JSON.stringify(
        filters,
      )}&from=${from}&to=${to}&timezone=${timezone}&mode=${mode}`,
      {
        headers: {
          'x-password': password,
        },
      },
    )
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getCustomEventsMetadata = (
  pid: string,
  event: string,
  tb: string = 'hour',
  period: string = '1d',
  from: string = '',
  to: string = '',
  timezone: string = '',
  password: string | undefined = '',
) =>
  api
    .get(
      `log/meta?pid=${pid}&timeBucket=${tb}&period=${period}&from=${from}&to=${to}&timezone=${timezone}&event=${event}`,
      {
        headers: {
          'x-password': password,
        },
      },
    )
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getPropertyMetadata = (
  pid: string,
  property: string,
  tb: string = 'hour',
  period: string = '1d',
  from: string = '',
  to: string = '',
  filters: any[] = [],
  timezone: string = '',
  password: string | undefined = '',
) =>
  api
    .get(
      `log/property?pid=${pid}&timeBucket=${tb}&period=${period}&from=${from}&to=${to}&timezone=${timezone}&property=${property}&filters=${JSON.stringify(
        filters,
      )}`,
      {
        headers: {
          'x-password': password,
        },
      },
    )
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getTrafficCompareData = (
  pid: string,
  tb: string = 'hour',
  period: string = '3d',
  filters: any[] = [],
  from: string = '',
  to: string = '',
  timezone: string = '',
  password: string | undefined = '',
  mode: 'periodical' | 'cumulative' = 'periodical',
) =>
  api
    .get(
      `log/chart?pid=${pid}&timeBucket=${tb}&period=${period}&filters=${JSON.stringify(
        filters,
      )}&from=${from}&to=${to}&timezone=${timezone}&mode=${mode}`,
      {
        headers: {
          'x-password': password,
        },
      },
    )
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getPerformanceCompareData = (
  pid: string,
  tb: string = 'hour',
  period: string = '3d',
  filters: any[] = [],
  from: string = '',
  to: string = '',
  timezone: string = '',
  measure: string = '',
  password: string | undefined = '',
) =>
  api
    .get(
      `log/performance/chart?pid=${pid}&timeBucket=${tb}&period=${period}&filters=${JSON.stringify(
        filters,
      )}&from=${from}&to=${to}&timezone=${timezone}&measure=${measure}`,
      {
        headers: {
          'x-password': password,
        },
      },
    )
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getPerfData = (
  pid: string,
  tb: string = 'hour',
  period: string = '3d',
  filters: any[] = [],
  from: string = '',
  to: string = '',
  timezone: string = '',
  measure: string = '',
  password: string | undefined = '',
) =>
  api
    .get(
      `log/performance?pid=${pid}&timeBucket=${tb}&period=${period}&filters=${JSON.stringify(
        filters,
      )}&from=${from}&to=${to}&timezone=${timezone}&measure=${measure}`,
      {
        headers: {
          'x-password': password,
        },
      },
    )
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getSessions = (
  pid: string,
  period: string = '3d',
  filters: any[] = [],
  from: string = '',
  to: string = '',
  take: number = 30,
  skip: number = 0,
  timezone: string = '',
  password: string | undefined = '',
) =>
  api
    .get(
      `log/sessions?pid=${pid}&take=${take}&skip=${skip}&period=${period}&filters=${JSON.stringify(
        filters,
      )}&from=${from}&to=${to}&timezone=${timezone}`,
      {
        headers: {
          'x-password': password,
        },
      },
    )
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getErrors = (
  pid: string,
  period: string = '3d',
  filters: any[] = [],
  options: any = {},
  from: string = '',
  to: string = '',
  take: number = 30,
  skip: number = 0,
  timezone: string = '',
  password: string | undefined = '',
) =>
  api
    .get(
      `log/errors?pid=${pid}&take=${take}&skip=${skip}&period=${period}&filters=${JSON.stringify(
        filters,
      )}&options=${JSON.stringify(options)}&from=${from}&to=${to}&timezone=${timezone}`,
      {
        headers: {
          'x-password': password,
        },
      },
    )
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getSession = (pid: string, psid: string, timezone: string = '', password: string | undefined = '') =>
  api
    .get(`log/session?pid=${pid}&psid=${psid}&timezone=${timezone}`, {
      headers: {
        'x-password': password,
      },
    })
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getError = (
  pid: string,
  eid: string,
  period: string = '7d',
  filters: any[] = [],
  from: string = '',
  to: string = '',
  timezone: string = '',
  password: string | undefined = '',
) =>
  api
    .get(
      `log/get-error?pid=${pid}&eid=${eid}&period=${period}&filters=${JSON.stringify(filters)}&from=${from}&to=${to}&timezone=${timezone}`,
      {
        headers: {
          'x-password': password,
        },
      },
    )
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw error.response
    })

export const getFunnelData = (
  pid: string,
  period: string = '3d',
  from: string = '',
  to: string = '',
  timezone: string = '',
  funnelId: string = '',
  password: string | undefined = '',
) =>
  api
    .get(`log/funnel?pid=${pid}&period=${period}&from=${from}&to=${to}&timezone=${timezone}&funnelId=${funnelId}`, {
      headers: {
        'x-password': password,
      },
    })
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getFunnels = (pid: string, password: string | undefined = '') =>
  api
    .get(`project/funnels/${pid}`, {
      headers: {
        'x-password': password,
      },
    })
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getProjectViews = (pid: string, password: string | undefined = '') =>
  api
    .get(`project/${pid}/views`, {
      headers: {
        'x-password': password,
      },
    })
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const createProjectView = (
  pid: string,
  name: string,
  type: 'traffic' | 'performance',
  filters: IFilter[],
  customEvents: Partial<IProjectViewCustomEvent>[],
) =>
  api
    .post(`project/${pid}/views`, { name, type, filters, customEvents })
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const updateProjectView = (
  pid: string,
  viewId: string,
  name: string,
  filters: IFilter[],
  customEvents: Partial<IProjectViewCustomEvent>[],
) =>
  api
    .patch(`project/${pid}/views/${viewId}`, { name, filters, customEvents })
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const deleteProjectView = (pid: string, viewId: string) =>
  api
    .delete(`project/${pid}/views/${viewId}`)
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getCaptchaData = (
  pid: string,
  tb: string = 'hour',
  period: string = '3d',
  filters: any[] = [],
  from: string = '',
  to: string = '',
) =>
  api
    .get(
      `log/captcha?pid=${pid}&timeBucket=${tb}&period=${period}&filters=${JSON.stringify(
        filters,
      )}&from=${from}&to=${to}`,
    )
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getOverallStats = (
  pids: string[],
  period: string,
  from = '',
  to = '',
  timezone = 'Etc/GMT',
  filters: any = '',
  password?: string,
) =>
  api
    .get(
      `log/birdseye?pids=[${_map(pids, (pid) => `"${pid}"`).join(
        ',',
      )}]&period=${period}&from=${from}&to=${to}&timezone=${timezone}&filters=${JSON.stringify(filters)}`,
      {
        headers: {
          'x-password': password,
        },
      },
    )
    .then((response): IOverall => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getPerformanceOverallStats = (
  pids: string[],
  period: string,
  from = '',
  to = '',
  timezone = 'Etc/GMT',
  filters: any = '',
  measure: any = '',
  password?: string,
) =>
  api
    .get(
      `log/performance/birdseye?pids=[${_map(pids, (pid) => `"${pid}"`).join(
        ',',
      )}]&period=${period}&from=${from}&to=${to}&timezone=${timezone}&filters=${JSON.stringify(filters)}&measure=${measure}`,
      {
        headers: {
          'x-password': password,
        },
      },
    )
    .then((response): IOverall => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getOverallStatsCaptcha = (
  pids: string[],
  period: string,
  from = '',
  to = '',
  timezone = 'Etc/GMT',
  filters: any = '',
) =>
  api
    .get(
      `log/captcha/birdseye?pids=[${_map(pids, (pid) => `"${pid}"`).join(
        ',',
      )}]&period=${period}&from=${from}&to=${to}&timezone=${timezone}&filters=${JSON.stringify(filters)}`,
    )
    .then((response): IOverall => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getLiveVisitors = (pids: string[], password?: string) =>
  api
    .get(`log/hb?pids=[${_map(pids, (pid) => `"${pid}"`).join(',')}]`, {
      headers: {
        'x-password': password,
      },
    })
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getGeneralStats = () =>
  api
    .get('log/generalStats')
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const shareProject = (
  pid: string,
  data: {
    email: string
    role: string
  },
) =>
  api
    .post(`/project/${pid}/share`, data)
    .then((response): IProject => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const deleteShareProjectUsers = (pid: string, userId: string) =>
  api
    .delete(`/project/${pid}/${userId}`)
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const deleteShareProject = (pid: string) =>
  api
    .delete(`user/share/${pid}`)
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const acceptShareProject = (id: string) =>
  api
    .get(`user/share/${id}`)
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const changeShareRole = (
  id: string,
  data: {
    role: string
  },
) =>
  api
    .put(`project/share/${id}`, data)
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const generate2FA = () =>
  api
    .post('2fa/generate')
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const enable2FA = (twoFactorAuthenticationCode: string) =>
  api
    .post('2fa/enable', { twoFactorAuthenticationCode })
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const disable2FA = (twoFactorAuthenticationCode: string) =>
  api
    .post('2fa/disable', { twoFactorAuthenticationCode })
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const submit2FA = (twoFactorAuthenticationCode: string) =>
  api
    .post('2fa/authenticate', { twoFactorAuthenticationCode })
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const generateApiKey = () =>
  api
    .post('user/api-key')
    .then(
      (
        response,
      ): {
        apiKey: string
      } => response.data,
    )
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const deleteApiKey = () =>
  api
    .delete('user/api-key')
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getInstalledExtensions = (limit = 100, offset = 0) =>
  api
    .get(`/extensions/installed?limit=${limit}&offset=${offset}`)
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export interface IGetLiveVisitorsInfo {
  psid: string
  dv: string
  br: string
  os: string
  cc: string
}

export const getLiveVisitorsInfo = (pid: string, password?: string) =>
  api
    .get(`log/liveVisitors?pid=${pid}`, {
      headers: {
        'x-password': password,
      },
    })
    .then((response): IGetLiveVisitorsInfo[] => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const removeTgIntegration = (tgID: string) =>
  api
    .delete(`user/tg/${tgID}`)
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getAlerts = (take: number = DEFAULT_ALERTS_TAKE, skip: number = 0) =>
  api
    .get(`alert?take=${take}&skip=${skip}`)
    .then(
      (
        response,
      ): {
        results: IAlerts[]
        total: number
        page_total: number
      } => response.data,
    )
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export interface ICreateAlert extends Omit<IAlerts, 'id' | 'lastTrigger' | 'lastTriggered' | 'created'> {}

export const createAlert = (data: ICreateAlert) =>
  api
    .post('alert', data)
    .then((response): IAlerts => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const updateAlert = (id: string, data: Partial<IAlerts>) =>
  api
    .put(`alert/${id}`, data)
    .then((response): IAlerts => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const deleteAlert = (id: string) =>
  api
    .delete(`alert/${id}`)
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export interface ICreateMonitor extends Omit<Monitor, 'id' | 'createdAt' | 'updatedAt'> {}

export const getAllMonitors = (take: number = DEFAULT_MONITORS_TAKE, skip: number = 0) =>
  api
    .get(`project/monitors?take=${take}&skip=${skip}`)
    .then(
      (
        response,
      ): {
        results: Monitor[]
        total: number
        page_total: number
      } => response.data,
    )
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getProjectMonitors = (projectId: string, take: number = DEFAULT_MONITORS_TAKE, skip: number = 0) =>
  api
    .get(`project/${projectId}/monitors?take=${take}&skip=${skip}`)
    .then(
      (
        response,
      ): {
        results: Monitor[]
        total: number
        page_total: number
      } => response.data,
    )
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getMonitorOverallStats = (
  pid: string,
  monitorIds: string[],
  period: string,
  from = '',
  to = '',
  timezone = 'Etc/GMT',
  password?: string,
) =>
  api
    .get(
      `log/monitor-data/birdseye?pid=${pid}&monitorIds=[${_map(monitorIds, (pid) => `"${pid}"`).join(
        ',',
      )}]&period=${period}&from=${from}&to=${to}&timezone=${timezone}`,
      {
        headers: {
          'x-password': password,
        },
      },
    )
    .then((response): MonitorOverall => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getMonitorStats = (
  pid: string,
  monitorId: string,
  period: string = '1d',
  timeBucket: string = 'hour',
  from: string = '',
  to: string = '',
  timezone: string = '',
  password: string | undefined = '',
) =>
  api
    .get(
      `log/monitor-data?pid=${pid}&monitorId=${monitorId}&timeBucket=${timeBucket}&period=${period}&from=${from}&to=${to}&timezone=${timezone}`,
      {
        headers: {
          'x-password': password,
        },
      },
    )
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const createMonitor = (pid: string, data: ICreateMonitor) =>
  api
    .post(`project/${pid}/monitor`, data)
    .then((response): Monitor => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const updateMonitor = (pid: string, id: string, data: Partial<Monitor>) =>
  api
    .patch(`project/${pid}/monitor/${id}`, data)
    .then((response): Monitor => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const deleteMonitor = (pid: string, id: string) =>
  api
    .delete(`project/${pid}/monitor/${id}`)
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const reGenerateCaptchaSecretKey = (pid: string) =>
  api
    .post(`project/secret-gen/${pid}`)
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const addSubscriber = (
  id: string,
  data: {
    email: string
    reportFrequency: string
  },
) =>
  api
    .post(`project/${id}/subscribers`, data)
    .then((response): ISubscribers => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const addFunnel = (pid: string, name: string, steps: string[]) =>
  api
    .post('project/funnel', { pid, name, steps })
    .then((response): any => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const updateFunnel = (id: string, pid: string, name: string, steps: string[]) =>
  api
    .patch('project/funnel', { id, name, steps, pid })
    .then((response): any => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const deleteFunnel = (id: string, pid: string) =>
  api
    .delete(`project/funnel/${id}/${pid}`)
    .then((response): any => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getSubscribers = (id: string, offset: number, limit: number) =>
  api
    .get(`project/${id}/subscribers?offset=${offset}&limit=${limit}`)
    .then(
      (
        response,
      ): {
        subscribers: ISubscribers[]
        count: number
      } => response.data,
    )
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const updateSubscriber = (
  id: string,
  subscriberId: string,
  data: {
    reportFrequency: string
  },
) =>
  api
    .patch(`project/${id}/subscribers/${subscriberId}`, data)
    .then((response): ISubscribers => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const removeSubscriber = (id: string, subscriberId: string) =>
  api
    .delete(`project/${id}/subscribers/${subscriberId}`)
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const confirmSubscriberInvite = (id: string, token: string) =>
  api
    .get(`project/${id}/subscribers/invite?token=${token}`)
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getProjectDataCustomEvents = (
  pid: string,
  tb: string = 'hour',
  period: string = '3d',
  filters: any[] = [],
  from: string = '',
  to: string = '',
  timezone: string = '',
  customEvents: string[] = [],
  password: string | undefined = '',
) =>
  api
    .get(
      `log/custom-events?pid=${pid}&timeBucket=${tb}&period=${period}&filters=${JSON.stringify(
        filters,
      )}&from=${from}&to=${to}&timezone=${timezone}&customEvents=${JSON.stringify(customEvents)}`,
      {
        headers: {
          'x-password': password,
        },
      },
    )
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
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
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const rejectTransferProject = (uuid: string) =>
  api
    .delete(`project/transfer?token=${uuid}`)
    .then((response): unknown => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const confirmTransferProject = (uuid: string) =>
  api
    .get(`project/transfer?token=${uuid}`)
    .then((response): unknown => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const generateSSOAuthURL = (provider: string) =>
  api
    .post('v1/auth/sso/generate', {
      provider,
    })
    .then((response): unknown => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getJWTBySSOHash = (hash: string, provider: string, refCode?: string) =>
  api
    .post('v1/auth/sso/hash', { hash, provider, refCode })
    .then((response): unknown => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const linkBySSOHash = (hash: string, provider: string) =>
  api
    .post('v1/auth/sso/link_by_hash', { hash, provider })
    .then((response): unknown => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const unlinkSSO = (provider: string) =>
  api
    .delete('v1/auth/sso/unlink', { data: { provider } })
    .then((response): unknown => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const processSSOToken = (token: string, hash: string) =>
  api
    .post('v1/auth/sso/process-token', { token, hash })
    .then((response): unknown => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const deletePartially = (
  id: string,
  data: {
    from: string
    to: string
  },
) =>
  api
    .delete(`project/partially/${id}?from=${data.from}&to=${data.to}`)
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getUserFlow = (
  pid: string,
  tb: string = 'hour',
  period: string = '3d',
  filters: any[] = [],
  from: string = '',
  to: string = '',
  timezone: string = '',
  password: string | undefined = '',
) =>
  api
    .get(
      `log/user-flow?pid=${pid}&timeBucket=${tb}&period=${period}&filters=${JSON.stringify(
        filters,
      )}&from=${from}&to=${to}&timezone=${timezone}`,
      {
        headers: {
          'x-password': password,
        },
      },
    )
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const checkPassword = (pid: string, password: string) =>
  api
    .get(`project/password/${pid}`, {
      headers: {
        'x-password': password,
      },
    })
    .then((response): Boolean => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getPaymentMetainfo = () =>
  api
    .get('user/metainfo')
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getUsageInfo = () =>
  api
    .get('user/usageinfo')
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getFilters = (pid: string, type: string, password = '') =>
  api
    .get(`log/filters?pid=${pid}&type=${type}`, {
      headers: {
        'x-password': password,
      },
    })
    .then((response): string[] => response.data)
    .catch((error) => {
      debug('%s', error)
      throw error
    })

export const getErrorsFilters = (pid: string, type: string, password = '') =>
  api
    .get(`log/errors-filters?pid=${pid}&type=${type}`, {
      headers: {
        'x-password': password,
      },
    })
    .then((response): string[] => response.data)
    .catch((error) => {
      debug('%s', error)
      throw error
    })

export const resetFilters = (pid: string, type: string, filters: string[]) =>
  api
    .delete(`project/reset-filters/${pid}?type=${type}&filters=${JSON.stringify(filters)}`)
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw error
    })

export const receiveLoginNotification = (receiveLoginNotifications: boolean) =>
  api
    .post('user/recieve-login-notifications', { receiveLoginNotifications })
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw error
    })

export const setPaypalEmail = (paypalPaymentsEmail: string | null) =>
  api
    .patch('user/set-paypal-email', { paypalPaymentsEmail })
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw error
    })

export const previewSubscriptionUpdate = (planId: number) =>
  api
    .post('user/preview-plan', { planId })
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw error
    })

export const changeSubscriptionPlan = (planId: number) =>
  api
    .post('user/change-plan', { planId })
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw error
    })

export const getBlogPosts = () =>
  api
    .get('v1/blog')
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw error
    })

export const getBlogPost = (slug: string) =>
  api
    .get(`v1/blog/${slug}`)
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw error
    })

export const getSitemap = () =>
  api
    .get('v1/blog/sitemap')
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw error
    })

export const getBlogPostWithCategory = (category: string, slug: string) =>
  api
    .get(`v1/blog/${category}/${slug}`)
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw error
    })

export const getLastPost = () =>
  api
    .get('v1/blog/last-post')
    .then(
      (
        response,
      ): {
        title: string
        handle: string
      } => response.data,
    )
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const unsubscribeFromEmailReports = (token: string) =>
  api
    .get(`user/unsubscribe/${token}`)
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw error
    })

export const unsubscribeFromEmailReports3rdParty = (token: string) =>
  api
    .get(`project/unsubscribe/${token}`)
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw error
    })

export const updateErrorStatus = (pid: string, status: 'resolved' | 'active', eid?: string, eids?: string[]) =>
  api
    .patch('log/error-status', { pid, eid, eids, status })
    .then((response): any => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getDetailsPrediction = (pid: string, password: string | undefined = ''): Promise<AIResponse> =>
  api
    .get(`project/${pid}/predict`, {
      headers: {
        'x-password': password,
      },
    })
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })
