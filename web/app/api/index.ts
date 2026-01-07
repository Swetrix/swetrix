import axios, { AxiosRequestConfig, AxiosResponse } from 'axios'
import createAuthRefreshInterceptor from 'axios-auth-refresh'
import _isEmpty from 'lodash/isEmpty'
import _map from 'lodash/map'

import { DEFAULT_ALERTS_TAKE, API_URL } from '~/lib/constants'
import { Alerts } from '~/lib/models/Alerts'
import { SSOProvider } from '~/lib/models/Auth'
import {
  Project,
  Overall,
  LiveStats,
  Funnel,
  SwetrixError,
  SwetrixErrorDetails,
  SessionDetails,
  Session,
  Profile,
  ProfileDetails,
} from '~/lib/models/Project'
import { Stats } from '~/lib/models/Stats'
import { User } from '~/lib/models/User'
import { Filter, ProjectViewCustomEvent } from '~/pages/Project/View/interfaces/traffic'
import { getAccessToken, setAccessToken } from '~/utils/accessToken'
import { clearLocalStorageOnLogout } from '~/utils/auth'
import { getRefreshToken } from '~/utils/refreshToken'

const api = axios.create({
  baseURL: API_URL,
  // Enable sending cookies with cross-origin requests
  withCredentials: true,
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
      clearLocalStorageOnLogout()
      // Redirect to server-side logout which handles cookie cleanup
      window.location.href = '/logout'
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

export const getProjects = (take = 0, skip = 0, search = '', period = '7d', sort = 'alpha_asc') =>
  api
    .get(`/project?take=${take}&skip=${skip}&search=${search}&period=${period}&sort=${sort}`)
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
  timeBucket: string,
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
      `log/errors?pid=${pid}&timeBucket=${timeBucket}&take=${take}&skip=${skip}&period=${period}&filters=${JSON.stringify(
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

interface ErrorOverviewStats {
  totalErrors: number
  uniqueErrors: number
  affectedSessions: number
  affectedUsers: number
  errorRate: number
}

interface MostFrequentError {
  eid: string
  name: string
  message: string
  count: number
  usersAffected: number
  lastSeen: string
}

interface ErrorOverviewChart {
  x: string[]
  occurrences: number[]
  affectedUsers: number[]
}

export interface ErrorOverviewResponse {
  stats: ErrorOverviewStats
  mostFrequentError: MostFrequentError | null
  chart: ErrorOverviewChart
  timeBucket: string
}

export const getErrorOverview = (
  pid: string,
  timeBucket = 'hour',
  period = '7d',
  filters: any[] = [],
  options: any = {},
  from = '',
  to = '',
  timezone = '',
  password: string | undefined = '',
) =>
  api
    .get(
      `log/error-overview?pid=${pid}&timeBucket=${timeBucket}&period=${period}&filters=${JSON.stringify(
        filters,
      )}&options=${JSON.stringify(options)}&from=${from}&to=${to}&timezone=${timezone}`,
      {
        headers: {
          'x-password': password,
        },
      },
    )
    .then((response): ErrorOverviewResponse => response.data)
    .catch((error) => {
      throw _isEmpty(error.response?.data?.message) ? error.response?.data : error.response?.data?.message
    })

export interface ErrorAffectedSession {
  psid: string
  profileId: string | null
  cc: string | null
  br: string | null
  os: string | null
  firstErrorAt: string
  lastErrorAt: string
  errorCount: number
}

export const getErrorSessions = (
  pid: string,
  eid: string,
  timeBucket = 'hour',
  period = '7d',
  from = '',
  to = '',
  take = 10,
  skip = 0,
  password: string | undefined = '',
) =>
  api
    .get(
      `log/error-sessions?pid=${pid}&eid=${eid}&timeBucket=${timeBucket}&period=${period}&from=${from}&to=${to}&take=${take}&skip=${skip}`,
      {
        headers: {
          'x-password': password,
        },
      },
    )
    .then((response): { sessions: ErrorAffectedSession[]; total: number } => response.data)
    .catch((error) => {
      throw _isEmpty(error.response?.data?.message) ? error.response?.data : error.response?.data?.message
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
  includeChart = false,
) =>
  api
    .get(
      `log/birdseye?pids=[${_map(pids, (pid) => `"${pid}"`).join(
        ',',
      )}]&timeBucket=${tb}&period=${period}&from=${from}&to=${to}&timezone=${timezone}&filters=${JSON.stringify(filters)}&includeChart=${includeChart}`,
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

export const getProjectGoals = (projectId: string, take: number = DEFAULT_GOALS_TAKE, skip = 0, search?: string) => {
  const params = new URLSearchParams({
    take: String(take),
    skip: String(skip),
  })

  if (search?.trim()) {
    params.append('search', search.trim())
  }

  return api
    .get(`/goal/project/${projectId}?${params.toString()}`)
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
}

export const getGoal = (goalId: string) =>
  api
    .get(`/goal/${goalId}`)
    .then((response): Goal => response.data)
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

// Feature Flags API
export interface TargetingRule {
  column: string
  filter: string
  isExclusive: boolean
}

export interface ProjectFeatureFlag {
  id: string
  key: string
  description: string | null
  flagType: 'boolean' | 'rollout'
  rolloutPercentage: number
  targetingRules: TargetingRule[] | null
  enabled: boolean
  pid: string
  created: string
}

export interface FeatureFlagStats {
  evaluations: number
  profileCount: number
  trueCount: number
  falseCount: number
  truePercentage: number
}

export const DEFAULT_FEATURE_FLAGS_TAKE = 20

export const getProjectFeatureFlags = (
  projectId: string,
  take: number = DEFAULT_FEATURE_FLAGS_TAKE,
  skip = 0,
  search?: string,
) => {
  const params = new URLSearchParams({
    take: String(take),
    skip: String(skip),
  })

  if (search?.trim()) {
    params.append('search', search.trim())
  }

  return api
    .get(`/feature-flag/project/${projectId}?${params.toString()}`)
    .then(
      (
        response,
      ): {
        results: ProjectFeatureFlag[]
        total: number
      } => response.data,
    )
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })
}

export const getFeatureFlagStats = (
  flagId: string,
  period: string,
  from: string = '',
  to: string = '',
  timezone?: string,
) =>
  api
    .get(`/feature-flag/${flagId}/stats`, {
      params: { period, from, to, timezone },
    })
    .then((response): FeatureFlagStats => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export interface FeatureFlagProfile {
  profileId: string
  isIdentified: boolean
  lastResult: boolean
  evaluationCount: number
  lastEvaluated: string
}

export const DEFAULT_FEATURE_FLAG_PROFILES_TAKE = 15

type FeatureFlagResultFilter = 'all' | 'true' | 'false'

export const getFeatureFlagProfiles = (
  flagId: string,
  period: string,
  from: string = '',
  to: string = '',
  timezone?: string,
  take: number = DEFAULT_FEATURE_FLAG_PROFILES_TAKE,
  skip: number = 0,
  resultFilter: FeatureFlagResultFilter = 'all',
) =>
  api
    .get(`/feature-flag/${flagId}/profiles`, {
      params: {
        period,
        from,
        to,
        timezone,
        take,
        skip,
        result: resultFilter === 'all' ? undefined : resultFilter,
      },
    })
    .then((response): { profiles: FeatureFlagProfile[]; total: number } => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

// Experiments (A/B Testing) API

export type ExperimentStatus = 'draft' | 'running' | 'paused' | 'completed'

export type ExposureTrigger = 'feature_flag' | 'custom_event'

export type MultipleVariantHandling = 'exclude' | 'first_exposure'

export type FeatureFlagMode = 'create' | 'link'

export interface ExperimentVariant {
  id?: string
  name: string
  key: string
  description?: string | null
  rolloutPercentage: number
  isControl: boolean
}

export interface Experiment {
  id: string
  name: string
  description: string | null
  hypothesis: string | null
  status: ExperimentStatus
  // Exposure criteria
  exposureTrigger: ExposureTrigger
  customEventName: string | null
  multipleVariantHandling: MultipleVariantHandling
  filterInternalUsers: boolean
  // Feature flag configuration
  featureFlagMode: FeatureFlagMode
  featureFlagKey: string | null
  startedAt: string | null
  endedAt: string | null
  pid: string
  goalId: string | null
  featureFlagId: string | null
  variants: ExperimentVariant[]
  created: string
}

export interface ExperimentVariantResult {
  key: string
  name: string
  isControl: boolean
  exposures: number
  conversions: number
  conversionRate: number
  probabilityOfBeingBest: number
  improvement: number
}

export interface ExperimentChartData {
  x: string[]
  winProbability: Record<string, number[]>
}

export interface ExperimentResults {
  experimentId: string
  status: ExperimentStatus
  variants: ExperimentVariantResult[]
  totalExposures: number
  totalConversions: number
  hasWinner: boolean
  winnerKey: string | null
  confidenceLevel: number
  chart?: ExperimentChartData
  timeBucket?: string[]
}

interface CreateExperiment {
  pid: string
  name: string
  description?: string
  hypothesis?: string
  // Exposure criteria
  exposureTrigger?: ExposureTrigger
  customEventName?: string
  multipleVariantHandling?: MultipleVariantHandling
  filterInternalUsers?: boolean
  // Feature flag configuration
  featureFlagMode?: FeatureFlagMode
  featureFlagKey?: string
  existingFeatureFlagId?: string
  goalId?: string
  variants: ExperimentVariant[]
}

export const DEFAULT_EXPERIMENTS_TAKE = 20

export const getExperiment = (experimentId: string) =>
  api
    .get(`/experiment/${experimentId}`)
    .then((response): Experiment => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const createExperiment = (data: CreateExperiment) =>
  api
    .post('experiment', data)
    .then((response): Experiment => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const updateExperiment = (id: string, data: Partial<CreateExperiment>) =>
  api
    .put(`experiment/${id}`, data)
    .then((response): Experiment => response.data)
    .catch((error) => {
      throw _isEmpty(error.response.data?.message) ? error.response.data : error.response.data.message
    })

export const getExperimentResults = (
  experimentId: string,
  period: string,
  timeBucket: string,
  from: string = '',
  to: string = '',
  timezone?: string,
) =>
  api
    .get(`/experiment/${experimentId}/results`, {
      params: { period, timeBucket, from, to, timezone },
    })
    .then((response): ExperimentResults => response.data)
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

export const getJWTBySSOHash = async (hash: string, provider: SSOProvider) => {
  let axiosPost

  if (provider === 'openid-connect') {
    axiosPost = api.post('v1/auth/oidc/hash', { hash })
  } else {
    axiosPost = api.post('v1/auth/sso/hash', { hash, provider })
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

export const processSSOToken = (token: string, hash: string) =>
  api
    .post('v1/auth/sso/process-token', { token, hash })
    .then((response): unknown => response.data)
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

export const updateErrorStatus = (pid: string, status: 'resolved' | 'active', eid?: string, eids?: string[]) =>
  api
    .patch('log/error-status', { pid, eid, eids, status })
    .then((response): any => response.data)
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
        notConnected?: boolean
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

// Revenue API
interface RevenueStatus {
  connected: boolean
  provider?: string
  currency?: string
  lastSyncAt?: string
}

interface RevenueStats {
  totalRevenue: number
  salesCount: number
  refundsCount: number
  refundsAmount: number
  averageOrderValue: number
  currency: string
  mrr: number
  revenueChange: number
}

interface RevenueChart {
  x: string[]
  revenue: number[]
  salesCount: number[]
  refundsAmount: number[]
}

export const getRevenueStatus = async (pid: string): Promise<RevenueStatus> => {
  return api
    .get(`project/${pid}/revenue/status`)
    .then((response): RevenueStatus => response.data)
    .catch((error) => {
      throw _isEmpty(error.response?.data?.message) ? error.response?.data : error.response?.data?.message
    })
}

export const getRevenueData = async (
  pid: string,
  period: string,
  from?: string,
  to?: string,
  timezone?: string,
  timeBucket?: string,
): Promise<{ stats: RevenueStats; chart: RevenueChart }> => {
  return api
    .get('log/revenue', {
      params: { pid, period, from, to, timezone, timeBucket },
    })
    .then((response): { stats: RevenueStats; chart: RevenueChart } => response.data)
    .catch((error) => {
      throw _isEmpty(error.response?.data?.message) ? error.response?.data : error.response?.data?.message
    })
}

// Blog Sitemap (kept client-side for SitemapFunction - no request object available)
export const getSitemap = () =>
  api
    .get('v1/blog/sitemap')
    .then((response): (string | string[])[] => response.data)
    .catch((error) => {
      throw _isEmpty(error.response?.data?.message) ? error.response?.data : error.response?.data?.message
    })
