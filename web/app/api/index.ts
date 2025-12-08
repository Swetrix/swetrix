import axios, { AxiosRequestConfig, AxiosResponse } from 'axios'
import createAuthRefreshInterceptor from 'axios-auth-refresh'
import _isArray from 'lodash/isArray'
import _isEmpty from 'lodash/isEmpty'
import _map from 'lodash/map'

import { DEFAULT_ALERTS_TAKE, API_URL } from '~/lib/constants'
import { Alerts } from '~/lib/models/Alerts'
import { Auth, SSOProvider } from '~/lib/models/Auth'
import { Metainfo } from '~/lib/models/Metainfo'
import { Role } from '~/lib/models/Organisation'
import {
  Project,
  Overall,
  LiveStats,
  Funnel,
  Extension,
  SwetrixError,
  SwetrixErrorDetails,
  SessionDetails,
  Session,
  Profile,
  ProfileDetails,
} from '~/lib/models/Project'
import { Stats } from '~/lib/models/Stats'
import { Subscriber } from '~/lib/models/Subscriber'
import { User, FeatureFlag } from '~/lib/models/User'
import { Filter, ProjectViewCustomEvent } from '~/pages/Project/View/interfaces/traffic'
import { getAccessToken, setAccessToken } from '~/utils/accessToken'
import { logout } from '~/utils/auth'
import { getRefreshToken } from '~/utils/refreshToken'

const api = axios.create({
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

      failedRequest.response.config.headers.Authorization = `Bearer ${accessToken}`
      return Promise.resolve()
    })
    .catch((error) => {
      logout()
      // If user session is invalid, this rejection will be thrown to authMe in AuthProvider and will reset user there too
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
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

export const authMe = (config?: AxiosRequestConfig) =>
  api.get('user/me', config).then(
    (
      response,
    ): {
      user: User
      totalMonthlyEvents: number
    } => response.data,
  )

export const logoutApi = (refreshToken: string | null) =>
  axios
    .post(`${API_URL}v1/auth/logout`, null, {
      headers: {
        Authorization: `Bearer ${refreshToken}`,
      },
    })
    .then((response) => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const logoutAllApi = () =>
  api
    .post(`${API_URL}v1/auth/logout-all`)
    .then((response) => response.data)
    .catch((error) => {
      throw new Error(error.respon)
    })

export const login = (credentials: { email: string; password: string }) =>
  api
    .post('v1/auth/login', credentials)
    .then((response): Auth => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const signup = (data: { email: string; password: string; refCode?: string; checkIfLeaked?: boolean }) =>
  api
    .post('v1/auth/register', data)
    .then((response): Auth => response.data)
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
    .then((response) => response.data)
    .catch((error) => {
      throw new Error(JSON.stringify(error.response.data))
    })

export const changeUserDetails = (data: User) =>
  api
    .put('/user', data)
    .then((response): User => response.data)
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
    .then((response): Partial<User> => response.data)
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
    .then((response): Partial<User> => response.data)
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
    .then(
      (
        response,
      ): {
        trials: number
        subscribers: number
        paid: number
        nextPayout: number
        pending: number
      } => response.data,
    )
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
    .then((response): Partial<User>[] => response.data)
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
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const confirmEmail = () =>
  api
    .post('/user/confirm_email')
    .then((response) => response.data)
    .catch((error) => {
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
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const confirmChangeEmail = ({ id }: { id: string }) =>
  api
    .get(`v1/auth/change-email/confirm/${id}`)
    .then((response) => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const verifyShare = ({ path, id }: { path: string; id: string }) =>
  api
    .get(`/project/${path}/${id}`)
    .then((response) => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getProjects = (
  take = 0,
  skip = 0,
  search = '',
  mode = 'default',
  period = '7d',
  useHostnameNavigation = false,
  sort = 'alpha_asc',
) =>
  api
    .get(
      `/project?take=${take}&skip=${skip}&search=${search}&mode=${mode}&period=${period}&use-hostname-navigation=${useHostnameNavigation}&sort=${sort}`,
    )
    .then(
      (
        response,
      ): {
        results: Project[]
        total: number
        page_total: number
      } => response.data,
    )
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getProjectsAvailableForOrganisation = (take = 0, skip = 0, search?: string) =>
  api
    .get(`/project/available-for-organisation?take=${take}&skip=${skip}&search=${search}`)
    .then((response) => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getOrganisations = (take = 0, skip = 0, search?: string) =>
  api
    .get(`/organisation?take=${take}&skip=${skip}&search=${search}`)
    .then((response) => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getOrganisation = (id: string) =>
  api
    .get(`/organisation/${id}`)
    .then((response) => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const deleteOrganisation = (id: string) =>
  api
    .delete(`/organisation/${id}`)
    .then((response) => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const assignProjectToOrganisation = (projectId: string, organisationId?: string) =>
  api
    .patch(`/project/${projectId}/organisation`, { organisationId })
    .then((response) => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const createOrganisation = (name: string) =>
  api
    .post('/organisation', { name })
    .then((response) => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const updateOrganisation = (organisationId: string, data: { name: string }) =>
  api
    .patch(`/organisation/${organisationId}`, data)
    .then((response) => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const addProjectToOrganisation = (organisationId: string, projectId: string) =>
  api
    .post(`/project/organisation/${organisationId}`, { projectId })
    .then((response) => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const removeProjectFromOrganisation = (organisationId: string, projectId: string) =>
  api
    .delete(`/project/organisation/${organisationId}/${projectId}`)
    .then((response) => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const changeOrganisationRole = (memberId: string, role: Role) =>
  api
    .patch(`/organisation/member/${memberId}`, { role })
    .then((response) => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const inviteOrganisationMember = (organisationId: string, data: { email: string; role: Role }) =>
  api
    .post(`/organisation/${organisationId}/invite`, data)
    .then((response) => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const acceptOrganisationInvitation = (tokenId: string) =>
  api
    .post(`/user/organisation/${tokenId}`)
    .then((response) => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const rejectOrganisationInvitation = (tokenId: string) =>
  api
    .delete(`/user/organisation/${tokenId}`)
    .then((response) => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const removeOrganisationMember = (memberId: string) =>
  api
    .delete(`/organisation/member/${memberId}`)
    .then((response) => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getProject = (pid: string, password?: string) =>
  api
    .get(`/project/${pid}`, {
      headers: {
        'x-password': password,
      },
    })
    .then((response): Project => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const createProject = (data: { name: string; organisationId?: string }) =>
  api
    .post('/project', data)
    .then((response): Project => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const updateProject = (id: string, data: Partial<Project>) =>
  api
    .put(`/project/${id}`, data)
    .then((response): Project => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const deleteProject = (id: string) =>
  api
    .delete(`/project/${id}`)
    .then((response) => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const resetProject = (id: string) =>
  api
    .delete(`/project/reset/${id}`)
    .then((response) => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getProjectData = (
  pid: string,
  tb = 'hour',
  period = '1d',
  filters: Filter[] = [],
  metrics: ProjectViewCustomEvent[] = [],
  from = '',
  to = '',
  timezone = '',
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
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getCustomEventsMetadata = (
  pid: string,
  event: string,
  tb = 'hour',
  period = '1d',
  from = '',
  to = '',
  timezone = '',
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
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getPropertyMetadata = (
  pid: string,
  property: string,
  tb = 'hour',
  period = '1d',
  from = '',
  to = '',
  filters: any[] = [],
  timezone = '',
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
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getTrafficCompareData = (
  pid: string,
  tb = 'hour',
  period = '3d',
  filters: any[] = [],
  from = '',
  to = '',
  timezone = '',
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
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getPerformanceCompareData = (
  pid: string,
  tb = 'hour',
  period = '3d',
  filters: any[] = [],
  from = '',
  to = '',
  timezone = '',
  measure = '',
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
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getPerfData = (
  pid: string,
  tb = 'hour',
  period = '3d',
  filters: any[] = [],
  from = '',
  to = '',
  timezone = '',
  measure = '',
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
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getSessions = (
  pid: string,
  period = '3d',
  filters: any[] = [],
  from = '',
  to = '',
  take = 30,
  skip = 0,
  timezone = '',
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
    .then((response): { sessions: Session[]; take: number; skip: number; appliedFilters: Filter[] } => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getErrors = (
  pid: string,
  period = '3d',
  filters: any[] = [],
  options: any = {},
  from = '',
  to = '',
  take = 30,
  skip = 0,
  timezone = '',
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
    .then((response): { errors: SwetrixError[] } => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getSession = (pid: string, psid: string, timezone = '', password: string | undefined = '') =>
  api
    .get(`log/session?pid=${pid}&psid=${psid}&timezone=${timezone}`, {
      headers: {
        'x-password': password,
      },
    })
    .then((response): { details: SessionDetails; [key: string]: any } => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getProfiles = (
  pid: string,
  period = '3d',
  filters: any[] = [],
  from = '',
  to = '',
  take = 30,
  skip = 0,
  timezone = '',
  profileType: 'all' | 'anonymous' | 'identified' = 'all',
  password: string | undefined = '',
) =>
  api
    .get(
      `log/profiles?pid=${pid}&take=${take}&skip=${skip}&period=${period}&filters=${JSON.stringify(
        filters,
      )}&from=${from}&to=${to}&timezone=${timezone}&profileType=${profileType}`,
      {
        headers: {
          'x-password': password,
        },
      },
    )
    .then((response): { profiles: Profile[]; take: number; skip: number; appliedFilters: Filter[] } => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getProfile = (
  pid: string,
  profileId: string,
  period = '7d',
  from = '',
  to = '',
  timezone = '',
  password: string | undefined = '',
) =>
  api
    .get(
      `log/profile?pid=${pid}&profileId=${encodeURIComponent(profileId)}&period=${period}&from=${from}&to=${to}&timezone=${timezone}`,
      {
        headers: {
          'x-password': password,
        },
      },
    )
    .then((response): ProfileDetails & { chart: any; timeBucket: string } => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getProfileSessions = (
  pid: string,
  profileId: string,
  period = '3d',
  filters: any[] = [],
  from = '',
  to = '',
  take = 30,
  skip = 0,
  timezone = '',
  password: string | undefined = '',
) =>
  api
    .get(
      `log/profile/sessions?pid=${pid}&profileId=${encodeURIComponent(profileId)}&take=${take}&skip=${skip}&period=${period}&filters=${JSON.stringify(
        filters,
      )}&from=${from}&to=${to}&timezone=${timezone}`,
      {
        headers: {
          'x-password': password,
        },
      },
    )
    .then((response): { sessions: Session[]; take: number; skip: number; appliedFilters: Filter[] } => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getError = (
  pid: string,
  eid: string,
  timeBucket = 'hour',
  period = '7d',
  filters: any[] = [],
  from = '',
  to = '',
  timezone = '',
  password: string | undefined = '',
) =>
  api
    .get(
      `log/get-error?pid=${pid}&eid=${eid}&timeBucket=${timeBucket}&period=${period}&filters=${JSON.stringify(
        filters,
      )}&from=${from}&to=${to}&timezone=${timezone}`,
      {
        headers: {
          'x-password': password,
        },
      },
    )
    .then((response): { details: SwetrixErrorDetails; [key: string]: any } => response.data)
    .catch((error) => {
      throw error.response
    })

export const getFunnelData = (
  pid: string,
  period = '3d',
  from = '',
  to = '',
  timezone = '',
  funnelId = '',
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
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getFunnels = (pid: string, password: string | undefined = '') =>
  api
    .get(`project/funnels/${pid}`, {
      headers: {
        'x-password': password,
      },
    })
    .then((response): Funnel[] => response.data)
    .catch((error) => {
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
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const createProjectView = (
  pid: string,
  name: string,
  type: 'traffic' | 'performance',
  filters: Filter[],
  customEvents: Partial<ProjectViewCustomEvent>[],
) =>
  api
    .post(`project/${pid}/views`, { name, type, filters, customEvents })
    .then((response) => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const updateProjectView = (
  pid: string,
  viewId: string,
  name: string,
  filters: Filter[],
  customEvents: Partial<ProjectViewCustomEvent>[],
) =>
  api
    .patch(`project/${pid}/views/${viewId}`, { name, filters, customEvents })
    .then((response) => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const deleteProjectView = (pid: string, viewId: string) =>
  api
    .delete(`project/${pid}/views/${viewId}`)
    .then((response) => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getCaptchaData = (pid: string, tb = 'hour', period = '3d', filters: any[] = [], from = '', to = '') =>
  api
    .get(
      `log/captcha?pid=${pid}&timeBucket=${tb}&period=${period}&filters=${JSON.stringify(
        filters,
      )}&from=${from}&to=${to}`,
    )
    .then((response) => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getOverallStats = (
  pids: string[],
  tb: string,
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
      )}]&timeBucket=${tb}&period=${period}&from=${from}&to=${to}&timezone=${timezone}&filters=${JSON.stringify(filters)}`,
      {
        headers: {
          'x-password': password,
        },
      },
    )
    .then((response): Overall => response.data)
    .catch((error) => {
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
    .then((response): Overall => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getLiveVisitors = (pids: string[], password?: string): Promise<LiveStats> =>
  api
    .get(`log/hb?pids=[${_map(pids, (pid) => `"${pid}"`).join(',')}]`, {
      headers: {
        'x-password': password,
      },
    })
    .then((response) => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getGeneralStats = () =>
  api
    .get('log/generalStats')
    .then((response): Stats => response.data)
    .catch((error) => {
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
    .then((response): Project => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const deleteShareProjectUsers = (pid: string, userId: string) =>
  api
    .delete(`/project/${pid}/${userId}`)
    .then((response) => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const rejectProjectShare = (actionId: string) =>
  api
    .delete(`/user/share/${actionId}`)
    .then((response) => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const acceptProjectShare = (actionId: string) =>
  api
    .get(`/user/share/${actionId}`)
    .then((response) => response.data)
    .catch((error) => {
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
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const generate2FA = () =>
  api
    .post('2fa/generate')
    .then((response) => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const enable2FA = (twoFactorAuthenticationCode: string) =>
  api
    .post('2fa/enable', { twoFactorAuthenticationCode })
    .then((response) => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const disable2FA = (twoFactorAuthenticationCode: string) =>
  api
    .post('2fa/disable', { twoFactorAuthenticationCode })
    .then((response) => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const submit2FA = (twoFactorAuthenticationCode: string) =>
  api
    .post('2fa/authenticate', { twoFactorAuthenticationCode })
    .then((response) => response.data)
    .catch((error) => {
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
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const deleteApiKey = () =>
  api
    .delete('user/api-key')
    .then((response) => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getInstalledExtensions = (limit = 100, offset = 0, config?: AxiosRequestConfig) =>
  api
    .get(`/extensions/installed?limit=${limit}&offset=${offset}`, config)
    .then(
      (
        response,
      ): {
        count: number
        extensions: Extension[]
      } => response.data,
    )
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export interface GetLiveVisitorsInfo {
  psid: string
  dv: string
  br: string
  os: string
  cc: string
}

export const getLiveVisitorsInfo = (pid: string, password?: string) =>
  api
    .get(`log/live-visitors?pid=${pid}`, {
      headers: {
        'x-password': password,
      },
    })
    .then((response): GetLiveVisitorsInfo[] => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const removeTgIntegration = (tgID: string) =>
  api
    .delete(`user/tg/${tgID}`)
    .then((response) => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getProjectAlerts = (projectId: string, take: number = DEFAULT_ALERTS_TAKE, skip = 0) =>
  api
    .get(`/alert/project/${projectId}?take=${take}&skip=${skip}`)
    .then(
      (
        response,
      ): {
        results: Alerts[]
        total: number
        page_total: number
      } => response.data,
    )
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getAlert = (alertId: string) =>
  api
    .get(`/alert/${alertId}`)
    .then((response): Alerts => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export type CreateAlert = Omit<Alerts, 'id' | 'lastTrigger' | 'lastTriggered' | 'created'>

export const createAlert = (data: CreateAlert) =>
  api
    .post('alert', data)
    .then((response): Alerts => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const updateAlert = (id: string, data: Partial<Alerts>) =>
  api
    .put(`alert/${id}`, data)
    .then((response): Alerts => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const deleteAlert = (id: string) =>
  api
    .delete(`alert/${id}`)
    .then((response) => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

// Goals API
export interface Goal {
  id: string
  name: string
  type: 'pageview' | 'custom_event'
  matchType: 'exact' | 'contains'
  value: string | null
  metadataFilters: { key: string; value: string }[] | null
  active: boolean
  pid: string
  created: string
}

export interface GoalStats {
  conversions: number
  uniqueSessions: number
  conversionRate: number
  previousConversions: number
  trend: number
}

export interface GoalChartData {
  x: string[]
  conversions: number[]
  uniqueSessions: number[]
}

export const DEFAULT_GOALS_TAKE = 20

export const getProjectGoals = (projectId: string, take: number = DEFAULT_GOALS_TAKE, skip = 0) =>
  api
    .get(`/goal/project/${projectId}?take=${take}&skip=${skip}`)
    .then(
      (
        response,
      ): {
        results: Goal[]
        total: number
      } => response.data,
    )
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getGoal = (goalId: string) =>
  api
    .get(`/goal/${goalId}`)
    .then((response): Goal => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export type CreateGoal = {
  pid: string
  name: string
  type: 'pageview' | 'custom_event'
  matchType: 'exact' | 'contains'
  value?: string
  metadataFilters?: { key: string; value: string }[]
}

export const createGoal = (data: CreateGoal) =>
  api
    .post('goal', data)
    .then((response): Goal => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const updateGoal = (id: string, data: Partial<Goal>) =>
  api
    .put(`goal/${id}`, data)
    .then((response): Goal => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const deleteGoal = (id: string) =>
  api
    .delete(`goal/${id}`)
    .then((response) => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getGoalStats = (goalId: string, period: string, from: string = '', to: string = '', timezone?: string) =>
  api
    .get(`/goal/${goalId}/stats`, {
      params: { period, from, to, timezone },
    })
    .then((response): GoalStats => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getGoalChart = (
  goalId: string,
  period: string,
  from: string = '',
  to: string = '',
  timeBucket: string = 'day',
  timezone?: string,
) =>
  api
    .get(`/goal/${goalId}/chart`, {
      params: { period, from, to, timeBucket, timezone },
    })
    .then((response): { chart: GoalChartData } => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const reGenerateCaptchaSecretKey = (pid: string) =>
  api
    .post(`project/secret-gen/${pid}`)
    .then((response) => response.data)
    .catch((error) => {
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
    .then((response): Subscriber => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const addFunnel = (pid: string, name: string, steps: string[]) =>
  api
    .post('project/funnel', { pid, name, steps })
    .then((response): any => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const updateFunnel = (id: string, pid: string, name: string, steps: string[]) =>
  api
    .patch('project/funnel', { id, name, steps, pid })
    .then((response): any => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const deleteFunnel = (id: string, pid: string) =>
  api
    .delete(`project/funnel/${id}/${pid}`)
    .then((response): any => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getAnnotations = (pid: string, password: string | undefined = '') =>
  api
    .get(`project/annotations/${pid}`, {
      headers: {
        'x-password': password,
      },
    })
    .then((response): any[] => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const createAnnotation = (pid: string, date: string, text: string) =>
  api
    .post('project/annotation', { pid, date, text })
    .then((response): any => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const updateAnnotation = (id: string, pid: string, date: string, text: string) =>
  api
    .patch('project/annotation', { id, pid, date, text })
    .then((response): any => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const deleteAnnotation = (id: string, pid: string) =>
  api
    .delete(`project/annotation/${id}/${pid}`)
    .then((response): any => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getSubscribers = (id: string, offset: number, limit: number) =>
  api
    .get(`project/${id}/subscribers?offset=${offset}&limit=${limit}`)
    .then(
      (
        response,
      ): {
        subscribers: Subscriber[]
        count: number
      } => response.data,
    )
    .catch((error) => {
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
    .then((response): Subscriber => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const removeSubscriber = (id: string, subscriberId: string) =>
  api
    .delete(`project/${id}/subscribers/${subscriberId}`)
    .then((response) => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const confirmSubscriberInvite = (id: string, token: string) =>
  api
    .get(`project/${id}/subscribers/invite?token=${token}`)
    .then((response) => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getProjectDataCustomEvents = (
  pid: string,
  tb = 'hour',
  period = '3d',
  filters: any[] = [],
  from = '',
  to = '',
  timezone = '',
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
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const rejectTransferProject = (uuid: string) =>
  api
    .delete(`project/transfer?token=${uuid}`)
    .then((response): unknown => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const confirmTransferProject = (uuid: string) =>
  api
    .get(`project/transfer?token=${uuid}`)
    .then((response): unknown => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const generateSSOAuthURL = async (provider: SSOProvider, redirectUrl?: string) => {
  const payload = {
    provider,
    redirectUrl,
  }

  let authInitiateRequest

  if (provider === 'openid-connect') {
    authInitiateRequest = api.post('v1/auth/oidc/initiate', payload)
  } else {
    authInitiateRequest = api.post('v1/auth/sso/generate', payload)
  }

  return authInitiateRequest
    .then(
      (
        response,
      ): {
        uuid: string
        auth_url: string
        expires_in: number
      } => response.data,
    )
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })
}

export const getJWTBySSOHash = async (hash: string, provider: SSOProvider, refCode?: string) => {
  let axiosPost

  if (provider === 'openid-connect') {
    axiosPost = api.post('v1/auth/oidc/hash', { hash })
  } else {
    axiosPost = api.post('v1/auth/sso/hash', { hash, provider, refCode })
  }

  return axiosPost
    .then(
      (
        response,
      ): {
        accessToken: string
        refreshToken: string
        user: User
        totalMonthlyEvents: number
      } => response.data,
    )
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })
}

export const processSSOTokenCommunityEdition = (code: string, hash: string, redirectUrl: string) =>
  api
    .post('v1/auth/oidc/process-token', { code, hash, redirectUrl })
    .then((response): unknown => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const linkBySSOHash = (hash: string, provider: SSOProvider) =>
  api
    .post('v1/auth/sso/link_by_hash', { hash, provider })
    .then((response): unknown => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const unlinkSSO = (provider: SSOProvider) =>
  api
    .delete('v1/auth/sso/unlink', { data: { provider } })
    .then((response): unknown => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const processSSOToken = (token: string, hash: string) =>
  api
    .post('v1/auth/sso/process-token', { token, hash })
    .then((response): unknown => response.data)
    .catch((error) => {
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
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getUserFlow = (
  pid: string,
  tb = 'hour',
  period = '3d',
  filters: any[] = [],
  from = '',
  to = '',
  timezone = '',
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
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const checkPassword = (pid: string, password: string) =>
  api
    .get(`project/password/${pid}`, {
      headers: {
        'x-password': password,
      },
    })
    .then((response): boolean => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getPaymentMetainfo = (config?: AxiosRequestConfig) =>
  api
    .get('user/metainfo', config)
    .then((response): Metainfo => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getUsageInfo = () =>
  api
    .get('user/usageinfo')
    .then((response) => response.data)
    .catch((error) => {
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
      throw error
    })

export const getVersionFilters = (pid: string, type: 'traffic' | 'errors', column: 'br' | 'os', password = '') =>
  api
    .get(`log/filters/versions?pid=${pid}&type=${type}&column=${column}`, {
      headers: {
        'x-password': password,
      },
    })
    .then((response): Array<{ name: string; version: string }> => response.data)
    .catch((error) => {
      throw error
    })

export const resetFilters = (pid: string, type: string, filters: string[]) =>
  api
    .delete(`project/reset-filters/${pid}?type=${type}&filters=${JSON.stringify(filters)}`)
    .then((response) => response.data)
    .catch((error) => {
      throw error
    })

export const receiveLoginNotification = (receiveLoginNotifications: boolean) =>
  api
    .post('user/recieve-login-notifications', { receiveLoginNotifications })
    .then((response) => response.data)
    .catch((error) => {
      throw error
    })

export const setPaypalEmail = (paypalPaymentsEmail: string | null) =>
  api
    .patch('user/set-paypal-email', { paypalPaymentsEmail })
    .then((response) => response.data)
    .catch((error) => {
      throw error
    })

export const previewSubscriptionUpdate = (planId: number) =>
  api
    .post('user/preview-plan', { planId })
    .then((response) => response.data)
    .catch((error) => {
      throw error
    })

export const changeSubscriptionPlan = (planId: number) =>
  api
    .post('user/change-plan', { planId })
    .then((response) => response.data)
    .catch((error) => {
      throw error
    })

export const getBlogPosts = () =>
  api
    .get('v1/blog')
    .then((response) => response.data)
    .catch((error) => {
      throw error
    })

export const getBlogPost = (slug: string) =>
  api
    .get(`v1/blog/${slug}`)
    .then((response) => response.data)
    .catch((error) => {
      throw error
    })

export const getSitemap = () =>
  api
    .get('v1/blog/sitemap')
    .then((response) => response.data)
    .catch((error) => {
      throw error
    })

export const getBlogPostWithCategory = (category: string, slug: string) =>
  api
    .get(`v1/blog/${category}/${slug}`)
    .then((response) => response.data)
    .catch((error) => {
      throw error
    })

export const unsubscribeFromEmailReports = (token: string) =>
  api
    .get(`user/unsubscribe/${token}`)
    .then((response) => response.data)
    .catch((error) => {
      throw error
    })

export const unsubscribeFromEmailReports3rdParty = (token: string) =>
  api
    .get(`project/unsubscribe/${token}`)
    .then((response) => response.data)
    .catch((error) => {
      throw error
    })

export const updateErrorStatus = (pid: string, status: 'resolved' | 'active', eid?: string, eids?: string[]) =>
  api
    .patch('log/error-status', { pid, eid, eids, status })
    .then((response): any => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const setFeatureFlags = (featureFlags: FeatureFlag[]) =>
  api
    .put('/user/feature-flags', { featureFlags })
    .then((response): User => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const updateOnboardingStep = (step: string) =>
  api
    .post('/user/onboarding/step', { step })
    .then((response): User => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const completeOnboarding = () =>
  api
    .post('/user/onboarding/complete')
    .then((response): User => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

// Google Search Console integration
export const generateGSCAuthURL = (pid: string) =>
  api
    .post(`v1/project/gsc/${pid}/connect`)
    .then((response): { url: string } => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getGSCStatus = (pid: string) =>
  api
    .get(`v1/project/gsc/${pid}/status`)
    .then((response): { connected: boolean; email?: string | null } => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const processGSCToken = (code: string, state: string) =>
  api
    .post(`v1/project/gsc/process-token`, { code, state })
    .then((response): { pid: string } => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getGSCProperties = (pid: string) =>
  api
    .get(`v1/project/gsc/${pid}/properties`)
    .then((response): { siteUrl: string; permissionLevel?: string }[] => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const setGSCProperty = (pid: string, propertyUri: string) =>
  api
    .post(`v1/project/gsc/${pid}/property`, { propertyUri })
    .then((response) => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const disconnectGSC = (pid: string) =>
  api
    .delete(`v1/project/gsc/${pid}/disconnect`)
    .then((response) => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getGSCKeywords = (
  pid: string,
  period = '3d',
  from = '',
  to = '',
  timezone = '',
  password: string | undefined = '',
) =>
  api
    .get(`log/keywords?pid=${pid}&period=${period}&from=${from}&to=${to}&timezone=${timezone}`, {
      headers: { 'x-password': password },
    })
    .then(
      (
        response,
      ): {
        keywords: { name: string; count: number; impressions: number; position: number; ctr: number }[]
      } => response.data,
    )
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

// AI Chat API with SSE streaming
interface AIChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface AIStreamCallbacks {
  onText: (chunk: string) => void
  onToolCall?: (toolName: string, args: unknown) => void
  onToolResult?: (toolName: string, result: unknown) => void
  onReasoning?: (chunk: string) => void
  onComplete: () => void
  onError: (error: Error) => void
}

export const askAI = async (
  pid: string,
  messages: AIChatMessage[],
  timezone: string,
  callbacks: AIStreamCallbacks,
  signal?: AbortSignal,
) => {
  const token = getAccessToken()

  try {
    const response = await fetch(`${API_URL}ai/${pid}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify({ messages, timezone }),
      signal,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No response body')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        callbacks.onComplete()
        break
      }

      buffer += decoder.decode(value, { stream: true })

      // Process SSE events
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          try {
            const parsed = JSON.parse(data)
            if (parsed.type === 'text') {
              callbacks.onText(parsed.content)
            } else if (parsed.type === 'tool-call') {
              callbacks.onToolCall?.(parsed.toolName, parsed.args)
            } else if (parsed.type === 'tool-result') {
              callbacks.onToolResult?.(parsed.toolName, parsed.result)
            } else if (parsed.type === 'reasoning') {
              callbacks.onReasoning?.(parsed.content)
            } else if (parsed.type === 'error') {
              callbacks.onError(new Error(parsed.content))
            } else if (parsed.type === 'done') {
              callbacks.onComplete()
              return
            }
          } catch {
            // Ignore parsing errors for incomplete JSON
          }
        }
      }
    }
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      callbacks.onComplete()
      return
    }
    callbacks.onError(error as Error)
  }
}

// AI Chat History API
export interface AIChatSummary {
  id: string
  name: string | null
  created: string
  updated: string
}

interface AIChat extends AIChatSummary {
  messages: AIChatMessage[]
}

export const getRecentAIChats = async (pid: string, limit: number = 5): Promise<AIChatSummary[]> => {
  return api
    .get(`ai/${pid}/chats`, {
      params: { limit },
      headers: { Authorization: getAccessToken() ? `Bearer ${getAccessToken()}` : '' },
    })
    .then((response): AIChatSummary[] => response.data)
    .catch((error) => {
      throw _isEmpty(error.response?.data?.message) ? error.response?.data : error.response?.data?.message
    })
}

export const getAllAIChats = async (
  pid: string,
  skip: number = 0,
  take: number = 20,
): Promise<{ chats: AIChatSummary[]; total: number }> => {
  return api
    .get(`ai/${pid}/chats/all`, {
      params: { skip, take },
      headers: { Authorization: getAccessToken() ? `Bearer ${getAccessToken()}` : '' },
    })
    .then((response): { chats: AIChatSummary[]; total: number } => response.data)
    .catch((error) => {
      throw _isEmpty(error.response?.data?.message) ? error.response?.data : error.response?.data?.message
    })
}

export const getAIChat = async (pid: string, chatId: string): Promise<AIChat> => {
  return api
    .get(`ai/${pid}/chats/${chatId}`, {
      headers: { Authorization: getAccessToken() ? `Bearer ${getAccessToken()}` : '' },
    })
    .then((response): AIChat => response.data)
    .catch((error) => {
      throw _isEmpty(error.response?.data?.message) ? error.response?.data : error.response?.data?.message
    })
}

export const createAIChat = async (pid: string, messages: AIChatMessage[], name?: string): Promise<AIChat> => {
  return api
    .post(
      `ai/${pid}/chats`,
      { messages, name },
      { headers: { Authorization: getAccessToken() ? `Bearer ${getAccessToken()}` : '' } },
    )
    .then((response): AIChat => response.data)
    .catch((error) => {
      throw _isEmpty(error.response?.data?.message) ? error.response?.data : error.response?.data?.message
    })
}

export const updateAIChat = async (
  pid: string,
  chatId: string,
  data: { messages?: AIChatMessage[]; name?: string },
): Promise<AIChat> => {
  return api
    .post(`ai/${pid}/chats/${chatId}`, data, {
      headers: { Authorization: getAccessToken() ? `Bearer ${getAccessToken()}` : '' },
    })
    .then((response): AIChat => response.data)
    .catch((error) => {
      throw _isEmpty(error.response?.data?.message) ? error.response?.data : error.response?.data?.message
    })
}

export const deleteAIChat = async (pid: string, chatId: string): Promise<{ success: boolean }> => {
  return api
    .delete(`ai/${pid}/chats/${chatId}`, {
      headers: { Authorization: getAccessToken() ? `Bearer ${getAccessToken()}` : '' },
    })
    .then((response): { success: boolean } => response.data)
    .catch((error) => {
      throw _isEmpty(error.response?.data?.message) ? error.response?.data : error.response?.data?.message
    })
}
