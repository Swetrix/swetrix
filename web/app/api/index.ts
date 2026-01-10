import axios, { AxiosRequestConfig, AxiosResponse } from 'axios'
import createAuthRefreshInterceptor from 'axios-auth-refresh'
import _isEmpty from 'lodash/isEmpty'
import _map from 'lodash/map'

import { API_URL } from '~/lib/constants'
import { SSOProvider } from '~/lib/models/Auth'
import { Project, Overall, LiveStats } from '~/lib/models/Project'
import { User } from '~/lib/models/User'
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

// Experiments (A/B Testing) API

type ExperimentStatus = 'draft' | 'running' | 'paused' | 'completed'

type ExposureTrigger = 'feature_flag' | 'custom_event'

type MultipleVariantHandling = 'exclude' | 'first_exposure'

type FeatureFlagMode = 'create' | 'link'

interface ExperimentVariant {
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

export const DEFAULT_EXPERIMENTS_TAKE = 20

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

export const processGSCToken = (code: string, state: string) =>
  api
    .post(`v1/project/gsc/process-token`, { code, state })
    .then((response): { pid: string } => response.data)
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
