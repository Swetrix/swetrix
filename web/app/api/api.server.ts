import { Auth } from '~/lib/models/Auth'
import { User } from '~/lib/models/User'
import type { ProjectFeatureAccess } from '~/lib/pricing/features'
import {
  getAccessToken,
  getRefreshToken,
  createAuthCookies,
  clearAuthCookies,
  AuthTokens,
  isPersistentSession,
} from '~/utils/session.server'
import { API_URL } from '~/lib/constants'
import type { V2Filter } from '~/api/v2/types'

// ============================================================================
// MARK: API utils
// ============================================================================

export function getClientIP(request: Request): string | null {
  const headers = request.headers

  const cfIP = headers.get('cf-connecting-ip')
  if (cfIP) return cfIP

  const realIP = headers.get('x-real-ip')
  if (realIP) return realIP

  const forwardedFor = headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  return null
}

async function fetchWithTimeout(
  input: string | URL,
  init: Parameters<typeof fetch>[1] = {},
  timeoutMs?: number,
): Promise<Response> {
  if (timeoutMs === undefined) {
    return fetch(input, init)
  }

  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  return fetch(input, { ...init, signal: controller.signal }).finally(() =>
    clearTimeout(id),
  )
}

interface ServerFetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  body?: Record<string, unknown> | FormData
  headers?: Record<string, string>
  /** Skip authentication - for public endpoints */
  skipAuth?: boolean
  timeoutMs?: number
}

interface ServerFetchResult<T> {
  data: T | null
  error: string | string[] | null
  status: number
  /** New cookies to set (e.g., after token refresh) */
  cookies: string[]
}

export async function serverFetch<T = unknown>(
  request: Request,
  endpoint: string,
  options: ServerFetchOptions = {},
): Promise<ServerFetchResult<T>> {
  const {
    method = 'GET',
    body,
    headers: customHeaders = {},
    skipAuth = false,
    timeoutMs = 15000,
  } = options

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint
  const url = `${API_URL}${cleanEndpoint}`

  const isFormData = body instanceof FormData

  const fetchHeaders: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...customHeaders,
  }

  const clientIP = getClientIP(request)
  if (clientIP) {
    fetchHeaders['X-Client-IP-Address'] = clientIP
  }

  const userAgent = request.headers.get('user-agent')
  if (userAgent) {
    fetchHeaders['User-Agent'] = userAgent
  }

  if (!skipAuth) {
    const accessToken = getAccessToken(request)
    if (accessToken) {
      fetchHeaders['Authorization'] = `Bearer ${accessToken}`
    }
  }

  const serializedBody = body
    ? isFormData
      ? body
      : JSON.stringify(body)
    : undefined

  try {
    const response = await fetchWithTimeout(
      url,
      {
        method,
        headers: fetchHeaders,
        body: serializedBody,
      },
      timeoutMs,
    )

    if ((response.status === 401 || response.status === 403) && !skipAuth) {
      const refreshResult = await tryRefreshToken(request)

      if (refreshResult.success && refreshResult.tokens) {
        fetchHeaders['Authorization'] =
          `Bearer ${refreshResult.tokens.accessToken}`

        const retryResponse = await fetchWithTimeout(
          url,
          {
            method,
            headers: fetchHeaders,
            body: serializedBody,
          },
          timeoutMs,
        )

        if (retryResponse.ok) {
          const retryContentType = retryResponse.headers.get('content-type')
          if (!retryContentType?.includes('application/json')) {
            return {
              data: null,
              error: null,
              status: retryResponse.status,
              cookies: refreshResult.cookies,
            }
          }

          const data = (await retryResponse.json()) as T
          return {
            data,
            error: null,
            status: retryResponse.status,
            cookies: refreshResult.cookies,
          }
        }

        const errorData = await parseErrorResponse(retryResponse)
        return {
          data: null,
          error: errorData,
          status: retryResponse.status,
          cookies: refreshResult.cookies,
        }
      }

      return {
        data: null,
        error: 'Session expired',
        status: 401,
        cookies: clearAuthCookies(),
      }
    }

    if (!response.ok) {
      const errorData = await parseErrorResponse(response)
      return {
        data: null,
        error: errorData,
        status: response.status,
        cookies: [],
      }
    }

    const contentType = response.headers.get('content-type')
    if (!contentType?.includes('application/json')) {
      return {
        data: null,
        error: null,
        status: response.status,
        cookies: [],
      }
    }

    const data = (await response.json()) as T
    return {
      data,
      error: null,
      status: response.status,
      cookies: [],
    }
  } catch (error) {
    console.error('[serverFetch] Request failed:', error)
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Network error',
      status: 500,
      cookies: [],
    }
  }
}

export async function streamingServerFetch(
  request: Request,
  endpoint: string,
  options: ServerFetchOptions = {},
): Promise<Response> {
  const {
    method = 'GET',
    body,
    headers: customHeaders = {},
    skipAuth = false,
    timeoutMs,
  } = options

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint
  const url = `${API_URL}${cleanEndpoint}`

  const fetchHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...customHeaders,
  }

  const clientIP = getClientIP(request)
  if (clientIP) {
    fetchHeaders['X-Client-IP-Address'] = clientIP
  }

  const userAgent = request.headers.get('user-agent')
  if (userAgent) {
    fetchHeaders['User-Agent'] = userAgent
  }

  if (!skipAuth) {
    const accessToken = getAccessToken(request)
    if (accessToken) {
      fetchHeaders['Authorization'] = `Bearer ${accessToken}`
    }
  }

  const serializedBody = body ? JSON.stringify(body) : undefined

  const response = await fetchWithTimeout(
    url,
    {
      method,
      headers: fetchHeaders,
      body: serializedBody,
    },
    timeoutMs,
  )

  // If 401/403, try to refresh the token and retry
  if ((response.status === 401 || response.status === 403) && !skipAuth) {
    const refreshResult = await tryRefreshToken(request)

    if (refreshResult.success && refreshResult.tokens) {
      fetchHeaders['Authorization'] =
        `Bearer ${refreshResult.tokens.accessToken}`

      const retryResponse = await fetchWithTimeout(
        url,
        {
          method,
          headers: fetchHeaders,
          body: serializedBody,
        },
        timeoutMs,
      )

      // If the response is not ok, we still want to propagate the refreshed cookies
      const finalResponse = new Response(retryResponse.body, retryResponse)
      for (const cookie of refreshResult.cookies) {
        finalResponse.headers.append('Set-Cookie', cookie)
      }

      return finalResponse
    }

    // Token refresh failed - clear auth cookies to prevent stale auth state
    const clearCookies = clearAuthCookies()
    const failedResponse = new Response(response.body, response)
    for (const cookie of clearCookies) {
      failedResponse.headers.append('Set-Cookie', cookie)
    }
    return failedResponse
  }

  return response
}

async function tryRefreshToken(
  request: Request,
): Promise<{ success: boolean; tokens?: AuthTokens; cookies: string[] }> {
  const refreshToken = getRefreshToken(request)

  if (!refreshToken) {
    return { success: false, cookies: [] }
  }

  try {
    const response = await fetch(`${API_URL}v1/auth/refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${refreshToken}`,
      },
    })

    if (!response.ok) {
      return { success: false, cookies: clearAuthCookies() }
    }

    const data = (await response.json()) as { accessToken: string }

    const tokens: AuthTokens = {
      accessToken: data.accessToken,
      refreshToken: refreshToken,
    }

    const remember = isPersistentSession(request)
    const cookies = createAuthCookies(tokens, remember)

    return { success: true, tokens, cookies }
  } catch {
    return { success: false, cookies: clearAuthCookies() }
  }
}

async function parseErrorResponse(
  response: Response,
): Promise<string | string[]> {
  try {
    const contentType = response.headers.get('content-type')
    if (!contentType?.includes('application/json')) {
      return response.statusText || 'Request failed'
    }

    const data = await response.json()

    // Handle various error response formats
    if (data.message) {
      return data.message
    }

    if (data.error) {
      return data.error
    }

    return 'Request failed'
  } catch {
    return response.statusText || 'Request failed'
  }
}

// ============================================================================
// MARK: Auth utils
// ============================================================================

interface AuthenticatedUser {
  user: User
  totalMonthlyEvents: number
}

export async function getAuthenticatedUser(
  request: Request,
): Promise<{ user: AuthenticatedUser; cookies: string[] } | null> {
  const accessToken = getAccessToken(request)

  if (!accessToken) {
    return null
  }

  const result = await serverFetch<AuthenticatedUser>(request, 'user/me')

  if (result.error || !result.data) {
    return null
  }

  return { user: result.data, cookies: result.cookies }
}

export async function loginUser(
  request: Request,
  credentials: { email: string; password: string },
  remember: boolean,
): Promise<{
  success: boolean
  data?: Auth
  error?: string | string[]
  cookies: string[]
  requires2FA?: boolean
}> {
  const result = await serverFetch<Auth>(request, 'v1/auth/login', {
    method: 'POST',
    body: credentials,
    skipAuth: true,
  })

  if (result.error || !result.data) {
    return {
      success: false,
      error: result.error || 'Login failed',
      cookies: [],
    }
  }

  const { accessToken, refreshToken, user } = result.data

  if (user.isTwoFactorAuthenticationEnabled) {
    const cookies = createAuthCookies({ accessToken, refreshToken }, false) // Session cookies for 2FA
    return {
      success: true,
      data: result.data,
      cookies,
      requires2FA: true,
    }
  }

  const cookies = createAuthCookies({ accessToken, refreshToken }, remember)

  return {
    success: true,
    data: result.data,
    cookies,
  }
}

export async function registerUser(
  request: Request,
  data: { email: string; password: string; checkIfLeaked?: boolean },
  remember: boolean,
): Promise<{
  success: boolean
  data?: Auth
  error?: string | string[]
  cookies: string[]
}> {
  const result = await serverFetch<Auth>(request, 'v1/auth/register', {
    method: 'POST',
    body: data,
    skipAuth: true,
  })

  if (result.error || !result.data) {
    return {
      success: false,
      error: result.error || 'Registration failed',
      cookies: [],
    }
  }

  const { accessToken, refreshToken } = result.data

  const cookies = createAuthCookies({ accessToken, refreshToken }, remember)

  return {
    success: true,
    data: result.data,
    cookies,
  }
}

export async function getInvitationDetails(
  request: Request,
  invitationId: string,
): Promise<{
  success: boolean
  data?: {
    id: string
    email: string
    type: string
    role: string
    inviterEmail: string
    targetName: string
  }
  error?: string
}> {
  const result = await serverFetch<{
    id: string
    email: string
    type: string
    role: string
    inviterEmail: string
    targetName: string
  }>(request, `v1/auth/invitation/${invitationId}`, {
    skipAuth: true,
  })

  if (result.error || !result.data) {
    return {
      success: false,
      error: Array.isArray(result.error)
        ? result.error[0]
        : result.error || 'Invitation not found',
    }
  }

  return {
    success: true,
    data: result.data,
  }
}

export async function claimInvitation(
  request: Request,
  invitationId: string,
): Promise<{ success: boolean; error?: string }> {
  const result = await serverFetch<{ success: boolean }>(
    request,
    `v1/auth/invitation/${invitationId}/claim`,
    { method: 'POST' },
  )

  if (result.error) {
    return {
      success: false,
      error: Array.isArray(result.error) ? result.error[0] : result.error,
    }
  }

  return { success: true }
}

export async function registerViaInvitation(
  request: Request,
  data: {
    pendingInvitationId: string
    email: string
    password: string
    checkIfLeaked: boolean
  },
): Promise<{
  success: boolean
  data?: Auth
  error?: string | string[]
  cookies: string[]
}> {
  const result = await serverFetch<Auth>(
    request,
    'v1/auth/register/invitation',
    {
      method: 'POST',
      body: data,
      skipAuth: true,
    },
  )

  if (result.error || !result.data) {
    return {
      success: false,
      error: result.error || 'Registration failed',
      cookies: [],
    }
  }

  const { accessToken, refreshToken } = result.data

  const cookies = createAuthCookies({ accessToken, refreshToken }, true)

  return {
    success: true,
    data: result.data,
    cookies,
  }
}

export async function logoutUser(
  request: Request,
  options: { logoutAll?: boolean } = {},
): Promise<{ cookies: string[] }> {
  const { logoutAll = false } = options

  if (logoutAll) {
    // Logout all sessions - uses access token
    await serverFetch(request, 'v1/auth/logout-all', {
      method: 'POST',
    }).catch(() => {
      // Ignore errors - we're logging out anyway
    })
  } else {
    // Logout single session - uses refresh token
    const refreshToken = getRefreshToken(request)

    if (refreshToken) {
      await serverFetch(request, 'v1/auth/logout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${refreshToken}`,
        },
        skipAuth: true,
      }).catch(() => {
        // Ignore errors - we're logging out anyway
      })
    }
  }

  return {
    cookies: clearAuthCookies(),
  }
}

// ============================================================================
// MARK: Blog API
// ============================================================================

interface BlogPost {
  slug: string
  title: string
  date: string
  hidden?: boolean
  intro?: string
}

interface BlogPostContent {
  body: string
  attributes?: {
    title?: string
    hidden?: boolean
    intro?: string
    date?: string
    author?: string
    twitter_handle?: string
    standalone?: boolean
  }
}

export async function getBlogPosts(
  request: Request,
): Promise<BlogPost[] | null> {
  const result = await serverFetch<BlogPost[]>(request, 'v1/blog', {
    skipAuth: true,
  })

  if (result.error || !result.data) {
    return null
  }

  return result.data
}

export async function getBlogPost(
  request: Request,
  slug: string,
): Promise<BlogPostContent | null> {
  const result = await serverFetch<BlogPostContent>(
    request,
    `v1/blog/${slug}`,
    { skipAuth: true },
  )

  if (result.error || !result.data) {
    return null
  }

  return result.data
}

export async function getBlogPostWithCategory(
  request: Request,
  category: string,
  slug: string,
): Promise<BlogPostContent | null> {
  const result = await serverFetch<BlogPostContent>(
    request,
    `v1/blog/${category}/${slug}`,
    {
      skipAuth: true,
    },
  )

  if (result.error || !result.data) {
    return null
  }

  return result.data
}

// ============================================================================
// MARK: Auth API
// ============================================================================

export interface AuthMeResponse {
  user: User
  totalMonthlyEvents: number
}

export async function authMeServer(
  request: Request,
): Promise<ServerFetchResult<AuthMeResponse>> {
  return serverFetch<AuthMeResponse>(request, 'user/me')
}

// ============================================================================
// MARK: General Stats API
// ============================================================================

export async function getGeneralStats(request: Request): Promise<Stats | null> {
  const result = await serverFetch<Stats>(request, 'log/generalStats', {
    skipAuth: true,
  })

  if (result.error || !result.data) {
    return null
  }

  return result.data
}

// ============================================================================
// MARK: Analytics Data API (Deferred Loading)
// ============================================================================

interface OverallPeriodStats {
  all: number
  unique?: number
  users?: number
  bounceRate?: number
  sdur?: number
}

export interface OverallObject {
  current: OverallPeriodStats
  previous: OverallPeriodStats
  change: number
  uniqueChange?: number
  usersChange?: number
  bounceRateChange?: number
  sdurChange?: number
  customEVFilterApplied?: boolean
  chart?: { x: string[]; visits: number[]; bounces?: number[] }
}

export interface AnalyticsParams {
  timeBucket: string
  period: string
  filters: V2Filter[]
  from?: string
  to?: string
  timezone: string
  mode?: 'periodical' | 'cumulative'
  password?: string
  metrics?: string
  // Concurrency (live visitors) data is only computed by the API when requested
  includeConcurrency?: boolean
}

function serializeFiltersForUrl(filters: V2Filter[]): string {
  return JSON.stringify(filters)
}

export async function getOverallStatsServer(
  request: Request,
  pids: string[],
  params: AnalyticsParams & { includeChart?: boolean },
): Promise<ServerFetchResult<Record<string, OverallObject>>> {
  const pidsParam = `[${pids.map((pid) => `"${pid}"`).join(',')}]`

  const queryParams = new URLSearchParams()
  queryParams.append('pids', pidsParam)
  queryParams.append('timeBucket', params.timeBucket)
  queryParams.append('period', params.period)
  queryParams.append('filters', serializeFiltersForUrl(params.filters))
  queryParams.append(
    'includeChart',
    params.includeChart !== false ? 'true' : 'false',
  )
  if (params.from) queryParams.append('from', params.from)
  if (params.to) queryParams.append('to', params.to)
  if (params.timezone) queryParams.append('timezone', params.timezone)

  const headers: Record<string, string> = {}
  if (params.password) {
    headers['x-password'] = params.password
  }

  return serverFetch<Record<string, OverallObject>>(
    request,
    `log/birdseye?${queryParams.toString()}`,
    { headers },
  )
}

interface Session {
  psid: string
  cc: string | null
  os: string | null
  br: string | null
  pageviews: number
  customEvents: number
  errors: number
  revenue?: number
  refunds?: number
  created: string
  isLive: 1 | 0
  sdur?: number
  sessionStart: string
  lastActivity: string
  profileId: string | null
  isIdentified: 1 | 0
  isFirstSession: 1 | 0
  hasReplay?: 1 | 0
  replayDuration?: number | null
  replayExpiresAt?: string | null
}

type SessionReplayPrivacy = 'total' | 'normal' | 'none'

export interface SessionReplayListItem extends Session {
  replayId: string
  privacyMode: SessionReplayPrivacy
  chunkCount: number
  eventCount: number
  replayStart: string
  replayCreatedAt: string
  lastReplayCreatedAt: string
  firstEventTimestamp?: number | string | null
  lastEventTimestamp?: number | string | null
}

export interface SessionReplaysResponse {
  replays: SessionReplayListItem[]
  take: number
  skip: number
}

export async function getSessionReplaysServer(
  request: Request,
  pid: string,
  params: AnalyticsParams & {
    take?: number
    skip?: number
  },
): Promise<ServerFetchResult<SessionReplaysResponse>> {
  const queryParams = new URLSearchParams()
  queryParams.append('pid', pid)
  queryParams.append('period', params.period)
  queryParams.append('filters', serializeFiltersForUrl(params.filters))
  queryParams.append('take', String(params.take || 30))
  queryParams.append('skip', String(params.skip || 0))
  if (params.from) queryParams.append('from', params.from)
  if (params.to) queryParams.append('to', params.to)
  if (params.timezone) queryParams.append('timezone', params.timezone)

  const headers: Record<string, string> = {}
  if (params.password) {
    headers['x-password'] = params.password
  }

  return serverFetch<SessionReplaysResponse>(
    request,
    `log/session-replays?${queryParams.toString()}`,
    {
      headers,
    },
  )
}

export interface GoalSessionsResponse {
  sessions: Session[]
  take: number
  skip: number
}

export interface JourneySessionsResponse {
  sessions: Session[]
  take: number
  skip: number
}

export async function getJourneySessionsServer(
  request: Request,
  pid: string,
  params: {
    period: string
    from?: string
    to?: string
    timezone?: string
    step: number
    page: string
    take?: number
    skip?: number
    password?: string
    filters?: V2Filter[]
  },
): Promise<ServerFetchResult<JourneySessionsResponse>> {
  const step = Math.min(10, Math.max(1, Math.floor(Number(params.step) || 1)))
  const take = Math.min(150, Math.max(1, Math.floor(Number(params.take) || 30)))
  const skip = Math.max(0, Math.floor(Number(params.skip) || 0))

  const queryParams = new URLSearchParams()
  queryParams.append('pid', pid)
  queryParams.append('period', params.period)
  queryParams.append('step', String(step))
  queryParams.append('page', params.page)
  queryParams.append('take', String(take))
  queryParams.append('skip', String(skip))
  queryParams.append('filters', JSON.stringify(params.filters || []))
  if (params.from) queryParams.append('from', params.from)
  if (params.to) queryParams.append('to', params.to)
  if (params.timezone) queryParams.append('timezone', params.timezone)

  const headers: Record<string, string> = {}
  if (params.password) {
    headers['x-password'] = params.password
  }

  return serverFetch<JourneySessionsResponse>(
    request,
    `log/journey-sessions?${queryParams.toString()}`,
    { headers },
  )
}

export async function getGoalSessionsServer(
  request: Request,
  goalId: string,
  params: {
    period: string
    from?: string
    to?: string
    timezone?: string
    take?: number
    skip?: number
  },
): Promise<ServerFetchResult<GoalSessionsResponse>> {
  const take = Math.min(150, Math.max(1, Math.floor(Number(params.take) || 30)))
  const skip = Math.max(0, Math.floor(Number(params.skip) || 0))

  const queryParams = new URLSearchParams()
  queryParams.append('period', params.period)
  queryParams.append('take', String(take))
  queryParams.append('skip', String(skip))
  if (params.from) queryParams.append('from', params.from)
  if (params.to) queryParams.append('to', params.to)
  if (params.timezone) queryParams.append('timezone', params.timezone)

  return serverFetch<GoalSessionsResponse>(
    request,
    `goal/${goalId}/sessions?${queryParams.toString()}`,
  )
}

export interface SessionReplayMetadata {
  hasReplay: boolean
  replayId: string
  privacyMode: SessionReplayPrivacy
  chunkCount: number
  eventCount: number
  replayDuration: number
  replayExpiresAt: string
}

export interface SessionReplayResponse {
  replay: SessionReplayMetadata | null
  events: Record<string, unknown>[]
}

export interface DeleteSessionReplayResponse {
  deleted: boolean
  deletedChunks: number
}

type SessionReplayExportStatus =
  | 'queued'
  | 'processing'
  | 'ready'
  | 'failed'
  | 'expired'

export interface SessionReplayExportResponse {
  exportId: string
  status: SessionReplayExportStatus
  progress: number
  filename: string
  expiresAt: string
  error?: string
}

export async function getSessionReplayServer(
  request: Request,
  pid: string,
  psid: string,
  replayId?: string,
  password?: string,
): Promise<ServerFetchResult<SessionReplayResponse>> {
  const queryParams = new URLSearchParams({
    pid,
    psid,
  })

  if (replayId) {
    queryParams.append('replayId', replayId)
  }

  const headers: Record<string, string> = {}
  if (password) {
    headers['x-password'] = password
  }

  return serverFetch<SessionReplayResponse>(
    request,
    `log/session-replay?${queryParams.toString()}`,
    {
      headers,
      timeoutMs: 30000,
    },
  )
}

export async function deleteSessionReplayServer(
  request: Request,
  pid: string,
  psid: string,
  replayId?: string,
  password?: string,
): Promise<ServerFetchResult<DeleteSessionReplayResponse>> {
  const queryParams = new URLSearchParams({
    pid,
    psid,
  })

  if (replayId) {
    queryParams.append('replayId', replayId)
  }

  const headers: Record<string, string> = {}
  if (password) {
    headers['x-password'] = password
  }

  return serverFetch<DeleteSessionReplayResponse>(
    request,
    `log/session-replay?${queryParams.toString()}`,
    {
      method: 'DELETE',
      headers,
      timeoutMs: 30000,
    },
  )
}

// ============================================================================
// MARK: Feature Flags API (Deferred Loading)
// ============================================================================

export interface TargetingRule {
  column: string
  filter: string
  isExclusive: boolean
}

export interface FeatureFlagSchedule {
  enabled?: boolean
  rolloutPercentage?: number
  applyAt: string
}

export type FeatureFlagStatus =
  | 'enabled'
  | 'disabled'
  | 'scheduled'
  | 'killed'
  | 'stale'

export type FeatureFlagStaleReason =
  | 'not_evaluated_recently'
  | 'permanent_rollout'
  | 'targeting_unchanged'
  | 'completed_experiment'

export interface ProjectFeatureFlag {
  id: string
  key: string
  description: string | null
  flagType: 'boolean' | 'rollout'
  rolloutPercentage: number
  targetingRules: TargetingRule[] | null
  enabled: boolean
  scheduledChange: FeatureFlagSchedule | null
  killSwitchActive: boolean
  killSwitchValue: boolean
  killedAt: string | null
  targetingUpdatedAt: string | null
  experimentId: string | null
  pid: string
  created: string
  updated: string
  lastEvaluatedAt: string | null
  status: FeatureFlagStatus
  staleReasons: FeatureFlagStaleReason[]
}

export interface FeatureFlagsResponse {
  results: ProjectFeatureFlag[]
  total: number
}

export async function getProjectFeatureFlagsServer(
  request: Request,
  projectId: string,
  take = 20,
  skip = 0,
  search?: string,
): Promise<ServerFetchResult<FeatureFlagsResponse>> {
  const params = new URLSearchParams({
    take: String(take),
    skip: String(skip),
  })

  if (search?.trim()) {
    params.append('search', search.trim())
  }

  return serverFetch<FeatureFlagsResponse>(
    request,
    `feature-flag/project/${projectId}?${params.toString()}`,
  )
}

export interface FeatureFlagStats {
  evaluations: number
  profileCount: number
  trueCount: number
  falseCount: number
  truePercentage: number
}

export async function getFeatureFlagStatsServer(
  request: Request,
  flagId: string,
  period: string,
  from = '',
  to = '',
  timezone?: string,
): Promise<ServerFetchResult<FeatureFlagStats>> {
  const params = new URLSearchParams({ period })
  if (from) params.append('from', from)
  if (to) params.append('to', to)
  if (timezone) params.append('timezone', timezone)

  return serverFetch<FeatureFlagStats>(
    request,
    `feature-flag/${flagId}/stats?${params.toString()}`,
  )
}

export interface FeatureFlagProfile {
  profileId: string
  isIdentified: boolean
  lastResult: boolean
  evaluationCount: number
  lastEvaluated: string
}

export interface FeatureFlagProfilesResponse {
  profiles: FeatureFlagProfile[]
  total: number
}

export async function getFeatureFlagProfilesServer(
  request: Request,
  flagId: string,
  period: string,
  from = '',
  to = '',
  timezone?: string,
  take = 15,
  skip = 0,
  resultFilter?: string,
): Promise<ServerFetchResult<FeatureFlagProfilesResponse>> {
  const params = new URLSearchParams({
    period,
    take: String(take),
    skip: String(skip),
  })
  if (from) params.append('from', from)
  if (to) params.append('to', to)
  if (timezone) params.append('timezone', timezone)
  if (resultFilter && resultFilter !== 'all')
    params.append('result', resultFilter)

  return serverFetch<FeatureFlagProfilesResponse>(
    request,
    `feature-flag/${flagId}/profiles?${params.toString()}`,
  )
}

// ============================================================================
// MARK: Goals API (Deferred Loading)
// ============================================================================

export type GoalConditionRelation = 'AND' | 'OR'

type GoalConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'exists'
  | 'not_exists'

type GoalConditionEventType = 'any' | 'pageview' | 'custom_event'

export interface GoalCondition {
  id?: string
  eventType: GoalConditionEventType
  field: string
  operator: GoalConditionOperator
  value?: string
  metadataKey?: string
}

export interface GoalConditions {
  relation: GoalConditionRelation
  conditions: GoalCondition[]
}

export interface Goal {
  id: string
  name: string
  type: 'pageview' | 'custom_event'
  matchType: 'exact' | 'contains'
  value: string | null
  metadataFilters: { key: string; value: string }[] | null
  conditions?: GoalConditions | null
  active: boolean
  pid: string
  created: string
}

export interface GoalsResponse {
  results: Goal[]
  total: number
}

interface ConversionTimeBucket {
  average: number | null
  median: number | null
  p75: number | null
}

interface ConversionTimeToConvert {
  fromSessionStart?: ConversionTimeBucket
  fromFirstPage?: ConversionTimeBucket
  fromFirstFunnelStep?: ConversionTimeBucket
}

export interface ConversionBreakdowns {
  countries?: Record<string, number>
  devices?: Record<string, number>
  browsers?: Record<string, number>
  sources?: Record<string, number>
  campaigns?: Record<string, number>
  pages?: Record<string, number>
  profileTypes?: Record<string, number>
}

export async function getProjectGoalsServer(
  request: Request,
  projectId: string,
  take = 20,
  skip = 0,
  search?: string,
): Promise<ServerFetchResult<GoalsResponse>> {
  const params = new URLSearchParams({
    take: String(take),
    skip: String(skip),
  })

  if (search?.trim()) {
    params.append('search', search.trim())
  }

  return serverFetch<GoalsResponse>(
    request,
    `goal/project/${projectId}?${params.toString()}`,
  )
}

export interface GoalStats {
  conversions: number
  uniqueSessions: number
  conversionRate: number
  previousConversions: number
  trend: number
  breakdowns?: ConversionBreakdowns
  timeToConvert?: ConversionTimeToConvert
}

export async function getGoalStatsServer(
  request: Request,
  goalId: string,
  period: string,
  from = '',
  to = '',
  timezone?: string,
  filters: V2Filter[] = [],
): Promise<ServerFetchResult<GoalStats>> {
  const params = new URLSearchParams({ period })
  if (from) params.append('from', from)
  if (to) params.append('to', to)
  if (timezone) params.append('timezone', timezone)
  params.append('filters', JSON.stringify(filters))

  return serverFetch<GoalStats>(
    request,
    `goal/${goalId}/stats?${params.toString()}`,
  )
}

export interface GoalChartData {
  x: string[]
  conversions: number[]
  uniqueSessions: number[]
}

export async function getGoalChartServer(
  request: Request,
  goalId: string,
  period: string,
  from = '',
  to = '',
  timeBucket = 'day',
  timezone?: string,
  filters: V2Filter[] = [],
): Promise<ServerFetchResult<{ chart: GoalChartData }>> {
  const params = new URLSearchParams({ period, timeBucket })
  if (from) params.append('from', from)
  if (to) params.append('to', to)
  if (timezone) params.append('timezone', timezone)
  params.append('filters', JSON.stringify(filters))

  return serverFetch<{ chart: GoalChartData }>(
    request,
    `goal/${goalId}/chart?${params.toString()}`,
  )
}

// ============================================================================
// MARK: Experiments API (Deferred Loading)
// ============================================================================

type ExperimentStatus = 'draft' | 'running' | 'paused' | 'completed'

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
  hypothesis?: string | null
  status: ExperimentStatus
  startedAt: string | null
  endedAt: string | null
  featureFlagKey: string | null
  exposureTrigger: ExposureTrigger
  customEventName?: string | null
  multipleVariantHandling: MultipleVariantHandling
  filterInternalUsers: boolean
  featureFlagMode: FeatureFlagMode
  featureFlagId: string | null
  goalId: string | null
  variants: ExperimentVariant[]
  pid: string
  created: string
}

export async function getExperimentServer(
  request: Request,
  experimentId: string,
): Promise<ServerFetchResult<Experiment>> {
  return serverFetch<Experiment>(request, `experiment/${experimentId}`)
}

export interface ExperimentVariantResult {
  key: string
  name: string
  isControl: boolean
  exposures: number
  conversions: number
  conversionRate: number
  improvement: number
  probabilityOfBeingBest: number
}

export interface ExperimentChartData {
  x: string[]
  winProbability: Record<string, number[]>
}

interface ExperimentResultWindow {
  mode: 'selected' | 'active_overlap' | 'final'
  from: string
  to: string
  selectedFrom: string
  selectedTo: string
  activeFrom?: string
  activeTo?: string
}

export interface ExperimentResults {
  experimentId: string
  status: ExperimentStatus
  hasWinner: boolean
  winnerKey: string | null
  totalExposures: number
  totalConversions: number
  confidenceLevel: number
  variants: ExperimentVariantResult[]
  chart?: ExperimentChartData
  resolvedTimeBucket?: string
  resultWindow?: ExperimentResultWindow
  isSegmented?: boolean
}

export async function getExperimentResultsServer(
  request: Request,
  experimentId: string,
  period: string,
  timeBucket: string,
  from = '',
  to = '',
  timezone?: string,
  filters: V2Filter[] = [],
): Promise<ServerFetchResult<ExperimentResults>> {
  const params = new URLSearchParams({ period, timeBucket })
  if (from) params.append('from', from)
  if (to) params.append('to', to)
  if (timezone) params.append('timezone', timezone)
  params.append('filters', JSON.stringify(filters))

  return serverFetch<ExperimentResults>(
    request,
    `experiment/${experimentId}/results?${params.toString()}`,
  )
}

export async function getGoalServer(
  request: Request,
  goalId: string,
): Promise<ServerFetchResult<Goal>> {
  return serverFetch<Goal>(request, `goal/${goalId}`)
}

// ============================================================================
// MARK: Projects API
// ============================================================================

export interface Project {
  id: string
  name: string
  origins: string[] | null
  ipBlacklist: string[] | null
  active: boolean
  public: boolean
  isPasswordProtected: boolean
  passwordHash: string | null
  admin: {
    id: string
    email: string
  }
  created: string
  isOwner: boolean
  isLocked: boolean
  featureAccess?: ProjectFeatureAccess
  isDataExists?: boolean
  isErrorDataExists?: boolean
  isCaptchaDataExists?: boolean
  isReplayDataExists?: boolean
  isCaptchaProject: boolean
  isCaptchaEnabled: boolean
  isAnalyticsProject: boolean
  captchaSecretKey: string | null
  role: string
  botsProtectionLevel: string
  isTransferring: boolean
  share?: {
    id: string
    confirmed: boolean
    role: string
  }
  funnels?: { id: string; name: string }[]
}

export async function getProjectServer(
  request: Request,
  pid: string,
  password?: string,
): Promise<ServerFetchResult<Project>> {
  const headers: Record<string, string> = {}
  if (password) {
    headers['x-password'] = password
  }

  return serverFetch<Project>(request, `project/${pid}`, { headers })
}

// ============================================================================
// MARK: Live Visitors API
// ============================================================================

export interface LiveStats {
  [pid: string]: number
}

export async function getLiveVisitorsServer(
  request: Request,
  pids: string[],
  password?: string,
): Promise<ServerFetchResult<LiveStats>> {
  const pidsParam = `[${pids.map((pid) => `"${pid}"`).join(',')}]`

  const headers: Record<string, string> = {}
  if (password) {
    headers['x-password'] = password
  }

  return serverFetch<LiveStats>(request, `log/hb?pids=${pidsParam}`, {
    headers,
  })
}

// ============================================================================
// MARK: Bot Protection Stats API
// ============================================================================

export type BotProtectionPeriod = '7d' | '30d' | '90d'

export interface BotProtectionStats {
  total: number
  period: BotProtectionPeriod
  byReason: { reason: string; count: number }[]
  byCountry: { cc: string; count: number }[]
}

export async function getBotProtectionStatsServer(
  request: Request,
  pid: string,
  period: BotProtectionPeriod,
  password?: string,
): Promise<ServerFetchResult<BotProtectionStats>> {
  const headers: Record<string, string> = {}
  if (password) {
    headers['x-password'] = password
  }

  return serverFetch<BotProtectionStats>(
    request,
    `log/bot-stats?pid=${pid}&period=${period}`,
    {
      headers,
    },
  )
}

// ============================================================================
// MARK: SSO API
// ============================================================================

export type SSOProvider = 'google' | 'github' | 'openid-connect'

export interface SSOAuthURLResponse {
  uuid: string
  auth_url: string
  expires_in: number
}

export async function generateSSOAuthURLServer(
  request: Request,
  provider: SSOProvider,
  redirectUrl?: string,
): Promise<ServerFetchResult<SSOAuthURLResponse>> {
  const payload: { provider: SSOProvider; redirectUrl?: string } = { provider }
  if (redirectUrl) {
    payload.redirectUrl = redirectUrl
  }

  const endpoint =
    provider === 'openid-connect'
      ? 'v1/auth/oidc/initiate'
      : 'v1/auth/sso/generate'

  return serverFetch<SSOAuthURLResponse>(request, endpoint, {
    method: 'POST',
    body: payload,
    skipAuth: true,
  })
}

export type { SSOHashSuccessResponse, SSOHashResponse } from '~/lib/models/Auth'

import type { SSOHashResponse } from '~/lib/models/Auth'
import { Stats } from '~/lib/models/Stats'

export async function getJWTBySSOHashServer(
  request: Request,
  hash: string,
  provider: SSOProvider,
): Promise<ServerFetchResult<SSOHashResponse>> {
  const endpoint =
    provider === 'openid-connect' ? 'v1/auth/oidc/hash' : 'v1/auth/sso/hash'
  const body = provider === 'openid-connect' ? { hash } : { hash, provider }

  return serverFetch<SSOHashResponse>(request, endpoint, {
    method: 'POST',
    body,
    skipAuth: true,
  })
}

export async function processSSOTokenCommunityEditionServer(
  request: Request,
  code: string,
  hash: string,
  redirectUrl: string,
): Promise<ServerFetchResult<unknown>> {
  return serverFetch<unknown>(request, 'v1/auth/oidc/process-token', {
    method: 'POST',
    body: { code, hash, redirectUrl },
    skipAuth: true,
  })
}

export async function linkBySSOHashServer(
  request: Request,
  hash: string,
  provider: SSOProvider,
): Promise<ServerFetchResult<unknown>> {
  return serverFetch<unknown>(request, 'v1/auth/sso/link_by_hash', {
    method: 'POST',
    body: { hash, provider },
  })
}

export interface LinkSSOWithPasswordParams {
  email: string
  password: string
  provider: SSOProvider
  ssoId: string | number
  twoFactorAuthenticationCode?: string
}

export async function linkSSOWithPasswordServer(
  request: Request,
  params: LinkSSOWithPasswordParams,
): Promise<ServerFetchResult<SSOHashResponse>> {
  return serverFetch<SSOHashResponse>(
    request,
    'v1/auth/sso/link_with_password',
    {
      method: 'POST',
      body: { ...params },
      skipAuth: true,
    },
  )
}

export async function processSSOTokenServer(
  request: Request,
  token: string,
  hash: string,
): Promise<ServerFetchResult<unknown>> {
  return serverFetch<unknown>(request, 'v1/auth/sso/process-token', {
    method: 'POST',
    body: { token, hash },
    skipAuth: true,
  })
}

// ============================================================================
// MARK: Journeys API
// ============================================================================

interface Journey {
  path: string[]
  value: number
}

export interface JourneysResponse {
  journeys: Journey[]
  totalSessions: number
}

export async function getJourneysServer(
  request: Request,
  pid: string,
  params: {
    period?: string
    filters?: V2Filter[]
    from?: string
    to?: string
    timezone?: string
    steps?: number
    journeys?: number
    password?: string
  } = {},
): Promise<ServerFetchResult<JourneysResponse>> {
  const steps = Math.min(10, Math.max(2, Math.floor(Number(params.steps) || 3)))
  const journeys = Math.min(
    100,
    Math.max(5, Math.floor(Number(params.journeys) || 20)),
  )

  const queryParams = new URLSearchParams()
  queryParams.append('pid', pid)
  queryParams.append('period', params.period || '3d')
  queryParams.append('filters', JSON.stringify(params.filters || []))
  queryParams.append('steps', String(steps))
  queryParams.append('journeys', String(journeys))
  if (params.from) queryParams.append('from', params.from)
  if (params.to) queryParams.append('to', params.to)
  if (params.timezone) queryParams.append('timezone', params.timezone)

  const headers: Record<string, string> = {}
  if (params.password) {
    headers['x-password'] = params.password
  }

  return serverFetch<JourneysResponse>(
    request,
    `log/journeys?${queryParams.toString()}`,
    {
      headers,
    },
  )
}

// ============================================================================
// MARK: Filters API
// ============================================================================

export async function getFiltersServer(
  request: Request,
  pid: string,
  type: string,
  password?: string,
): Promise<ServerFetchResult<string[]>> {
  const headers: Record<string, string> = {}
  if (password) {
    headers['x-password'] = password
  }

  return serverFetch<string[]>(request, `log/filters?pid=${pid}&type=${type}`, {
    headers,
  })
}

export interface DataDeletionPreview {
  // count of matching rows, keyed by event type (pageview, custom_event, ...)
  counts: Record<string, number>
  total: number
  // gap-filled, uniform buckets for the preview sparkline
  timeline: { x: string[]; counts: number[] }
}

export async function getDataDeletionPreviewServer(
  request: Request,
  pid: string,
  options: {
    filters?: V2Filter[]
    from?: string
    to?: string
  },
): Promise<ServerFetchResult<DataDeletionPreview>> {
  return serverFetch<DataDeletionPreview>(
    request,
    'log/data-deletion/preview',
    {
      method: 'POST',
      body: {
        pid,
        filters: JSON.stringify(options.filters || []),
        from: options.from,
        to: options.to,
      },
    },
  )
}

// ============================================================================
// MARK: Google Search Console API
// ============================================================================

export async function processGSCTokenServer(
  request: Request,
  code: string,
  state: string,
): Promise<ServerFetchResult<{ pid: string }>> {
  return serverFetch<{ pid: string }>(request, 'v1/project/gsc/process-token', {
    method: 'POST',
    body: { code, state },
  })
}

// ============================================================================
// MARK: Google Analytics 4 Import API
// ============================================================================

export async function processGA4ImportTokenServer(
  request: Request,
  code: string,
  state: string,
): Promise<ServerFetchResult<{ pid: string }>> {
  return serverFetch<{ pid: string }>(request, 'data-import/ga4/callback', {
    method: 'POST',
    body: { code, state },
  })
}

interface GSCKeyword {
  name: string
  count: number
  impressions: number
  position: number
  ctr: number
}

export interface GSCKeywordsResponse {
  keywords: GSCKeyword[]
  notConnected?: boolean
}

export async function getGSCKeywordsServer(
  request: Request,
  pid: string,
  params: {
    period?: string
    from?: string
    to?: string
    timezone?: string
    password?: string
  } = {},
): Promise<ServerFetchResult<GSCKeywordsResponse>> {
  const queryParams = new URLSearchParams()
  queryParams.append('pid', pid)
  queryParams.append('period', params.period || '3d')
  if (params.from) queryParams.append('from', params.from)
  if (params.to) queryParams.append('to', params.to)
  if (params.timezone) queryParams.append('timezone', params.timezone)

  const headers: Record<string, string> = {}
  if (params.password) {
    headers['x-password'] = params.password
  }

  return serverFetch<GSCKeywordsResponse>(
    request,
    `log/keywords?${queryParams.toString()}`,
    {
      headers,
    },
  )
}

interface GSCDateSeriesEntry {
  date: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

interface GSCTopPageEntry {
  page: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

interface GSCTopQueryEntry {
  name: string
  count: number
  impressions: number
  position: number
  ctr: number
}

interface GSCTopCountryEntry {
  country: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

interface GSCTopDeviceEntry {
  device: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

type GSCImpressionPositionBucketKey =
  | 'pos1To3'
  | 'pos4To10'
  | 'pos11To20'
  | 'pos21Plus'

type GSCOrganicPositionBucketKey =
  | 'pos1To3'
  | 'pos4To10'
  | 'pos11To20'
  | 'pos21To50'
  | 'pos51Plus'

interface GSCImpressionsByPositionEntry {
  key: GSCImpressionPositionBucketKey
  label: string
  impressions: number
  percentage: number
}

type GSCOrganicPositionEntry = { date: string } & Record<
  GSCOrganicPositionBucketKey,
  number
>

interface GSCBrandedTraffic {
  branded: number
  nonBranded: number
  skipped?: false
}

interface GSCSkippedBrandedTraffic {
  skipped: true
  branded: null
  nonBranded: null
}

export interface GSCDashboardResponse {
  notConnected?: boolean
  noProperty?: boolean
  summary?: {
    clicks: number
    impressions: number
    ctr: number
    position: number
  }
  previousSummary?: {
    clicks: number
    impressions: number
    ctr: number
    position: number
  } | null
  dateSeries?: GSCDateSeriesEntry[]
  topPages?: GSCTopPageEntry[]
  topQueries?: GSCTopQueryEntry[]
  topCountries?: GSCTopCountryEntry[]
  topDevices?: GSCTopDeviceEntry[]
  brandedTraffic?: GSCBrandedTraffic | GSCSkippedBrandedTraffic
  positionAnalyticsSkipped?: boolean
  impressionsByPosition?: GSCImpressionsByPositionEntry[] | null
  organicPositions?: GSCOrganicPositionEntry[] | null
}

export async function getGSCDashboardServer(
  request: Request,
  pid: string,
  params: {
    period?: string
    from?: string
    to?: string
    timezone?: string
    password?: string
    timeBucket?: string
    filters?: V2Filter[]
  } = {},
): Promise<ServerFetchResult<GSCDashboardResponse>> {
  const queryParams = new URLSearchParams()
  queryParams.append('pid', pid)
  queryParams.append('period', params.period || '7d')
  if (params.from) queryParams.append('from', params.from)
  if (params.to) queryParams.append('to', params.to)
  if (params.timezone) queryParams.append('timezone', params.timezone)
  if (params.timeBucket) queryParams.append('timeBucket', params.timeBucket)
  if (params.filters)
    queryParams.append('filters', serializeFiltersForUrl(params.filters))

  const headers: Record<string, string> = {}
  if (params.password) {
    headers['x-password'] = params.password
  }

  return serverFetch<GSCDashboardResponse>(
    request,
    `log/gsc-dashboard?${queryParams.toString()}`,
    {
      headers,
      timeoutMs: 60000,
    },
  )
}

export interface GSCDetailsResponse {
  type: 'queries' | 'pages' | 'none'
  data: Array<{
    name?: string
    page?: string
    count?: number
    clicks?: number
    impressions: number
    ctr: number
    position: number
  }>
}

export async function getGSCDetailsServer(
  request: Request,
  pid: string,
  params: {
    period?: string
    from?: string
    to?: string
    timezone?: string
    password?: string
    page?: string
    query?: string
  } = {},
): Promise<ServerFetchResult<GSCDetailsResponse>> {
  const queryParams = new URLSearchParams()
  queryParams.append('pid', pid)
  queryParams.append('period', params.period || '7d')
  if (params.from) queryParams.append('from', params.from)
  if (params.to) queryParams.append('to', params.to)
  if (params.timezone) queryParams.append('timezone', params.timezone)
  if (params.page) queryParams.append('page', params.page)
  if (params.query) queryParams.append('query', params.query)

  const headers: Record<string, string> = {}
  if (params.password) {
    headers['x-password'] = params.password
  }

  return serverFetch<GSCDetailsResponse>(
    request,
    `log/gsc-details?${queryParams.toString()}`,
    {
      headers,
    },
  )
}

// ============================================================================
// MARK: Revenue API
// ============================================================================

export interface RevenueStatus {
  connected: boolean
  provider?: string
  currency?: string
  lastSyncAt?: string
}

export async function getRevenueStatusServer(
  request: Request,
  pid: string,
): Promise<ServerFetchResult<RevenueStatus>> {
  return serverFetch<RevenueStatus>(request, `project/${pid}/revenue/status`)
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

export interface RevenueDataResponse {
  stats: RevenueStats
  chart: RevenueChart
}

export async function getRevenueDataServer(
  request: Request,
  pid: string,
  params: {
    period: string
    from?: string
    to?: string
    timezone?: string
    timeBucket?: string
  },
): Promise<ServerFetchResult<RevenueDataResponse>> {
  const queryParams = new URLSearchParams({
    pid,
    period: params.period,
  })
  if (params.from) queryParams.append('from', params.from)
  if (params.to) queryParams.append('to', params.to)
  if (params.timezone) queryParams.append('timezone', params.timezone)
  if (params.timeBucket) queryParams.append('timeBucket', params.timeBucket)

  return serverFetch<RevenueDataResponse>(
    request,
    `log/revenue?${queryParams.toString()}`,
  )
}

// ============================================================================
// MARK: Tools API
// ============================================================================

interface IpLookupResponse {
  ip: string
  country: string | null
  countryName: string | null
  city: string | null
  region: string | null
  regionCode: string | null
  continentCode: string | null
  continentName: string | null
  postalCode: string | null
  latitude: number | null
  longitude: number | null
  timezone: string | null
  isp: string | null
  organization: string | null
  userType: string | null
  connectionType: string | null
  isInEuropeanUnion: boolean
  ipVersion: 4 | 6
}

export async function getIpLookupServer(
  request: Request,
  ip: string,
): Promise<ServerFetchResult<IpLookupResponse>> {
  const queryParams = new URLSearchParams()
  queryParams.append('ip', ip)

  return serverFetch<IpLookupResponse>(
    request,
    `tools/ip-lookup?${queryParams.toString()}`,
    {
      skipAuth: true,
    },
  )
}
