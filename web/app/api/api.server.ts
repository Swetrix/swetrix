import { Auth } from '~/lib/models/Auth'
import { User } from '~/lib/models/User'
import {
  getAccessToken,
  getRefreshToken,
  createAuthCookies,
  clearAuthCookies,
  AuthTokens,
} from '~/utils/session.server'

// ============================================================================
// MARK: API utils
// ============================================================================

function getApiUrl(): string {
  const isStaging = process.env.STAGING === 'true'
  const isSelfhosted = Boolean(process.env.__SELFHOSTED)

  let apiUrl: string | undefined

  if (isSelfhosted || !isStaging) {
    apiUrl = process.env.API_URL
  } else {
    apiUrl = process.env.API_STAGING_URL
  }

  if (!apiUrl) {
    throw new Error('API_URL environment variable is not set')
  }

  // Ensure trailing slash
  return apiUrl.endsWith('/') ? apiUrl : `${apiUrl}/`
}

function getClientIP(request: Request): string | null {
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

interface ServerFetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  body?: Record<string, unknown>
  headers?: Record<string, string>
  /** Skip authentication - for public endpoints */
  skipAuth?: boolean
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
  const { method = 'GET', body, headers: customHeaders = {}, skipAuth = false } = options

  const apiUrl = getApiUrl()
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint
  const url = `${apiUrl}${cleanEndpoint}`

  const fetchHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...customHeaders,
  }

  const clientIP = getClientIP(request)
  if (clientIP) {
    fetchHeaders['X-Client-IP-Address'] = clientIP
  }

  if (!skipAuth) {
    const accessToken = getAccessToken(request)
    if (accessToken) {
      fetchHeaders['Authorization'] = `Bearer ${accessToken}`
    }
  }

  try {
    const response = await fetch(url, {
      method,
      headers: fetchHeaders,
      body: body ? JSON.stringify(body) : undefined,
    })

    if ((response.status === 401 || response.status === 403) && !skipAuth) {
      const refreshResult = await tryRefreshToken(request)

      if (refreshResult.success && refreshResult.tokens) {
        fetchHeaders['Authorization'] = `Bearer ${refreshResult.tokens.accessToken}`

        const retryResponse = await fetch(url, {
          method,
          headers: fetchHeaders,
          body: body ? JSON.stringify(body) : undefined,
        })

        if (retryResponse.ok) {
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

async function tryRefreshToken(
  request: Request,
): Promise<{ success: boolean; tokens?: AuthTokens; cookies: string[] }> {
  const refreshToken = getRefreshToken(request)

  if (!refreshToken) {
    return { success: false, cookies: [] }
  }

  const apiUrl = getApiUrl()

  try {
    const response = await fetch(`${apiUrl}v1/auth/refresh-token`, {
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

    const cookies = createAuthCookies(tokens, true)

    return { success: true, tokens, cookies }
  } catch {
    return { success: false, cookies: clearAuthCookies() }
  }
}

async function parseErrorResponse(response: Response): Promise<string | string[]> {
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

export async function getBlogPosts(request: Request): Promise<BlogPost[] | null> {
  const result = await serverFetch<BlogPost[]>(request, 'v1/blog', { skipAuth: true })

  if (result.error || !result.data) {
    return null
  }

  return result.data
}

export async function getBlogPost(request: Request, slug: string): Promise<BlogPostContent | null> {
  const result = await serverFetch<BlogPostContent>(request, `v1/blog/${slug}`, { skipAuth: true })

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
  const result = await serverFetch<BlogPostContent>(request, `v1/blog/${category}/${slug}`, { skipAuth: true })

  if (result.error || !result.data) {
    return null
  }

  return result.data
}

export async function getSitemap(request: Request): Promise<(string | string[])[] | null> {
  const result = await serverFetch<(string | string[])[]>(request, 'v1/blog/sitemap', { skipAuth: true })

  if (result.error || !result.data) {
    return null
  }

  return result.data
}

// ============================================================================
// MARK: General Stats API
// ============================================================================

interface GeneralStats {
  users: number
  projects: number
  events: number
}

export async function getGeneralStats(request: Request): Promise<GeneralStats | null> {
  const result = await serverFetch<GeneralStats>(request, 'log/generalStats', { skipAuth: true })

  if (result.error || !result.data) {
    return null
  }

  return result.data
}

// ============================================================================
// MARK: Analytics Data API (Deferred Loading)
// ============================================================================

export interface AnalyticsFilter {
  column: string
  filter: string
  isExclusive: boolean
  isContains?: boolean
}

export interface TrafficLogResponse {
  params?: Record<string, { name: string; count: number }[]>
  chart: {
    x: string[]
    visits: number[]
    uniques: number[]
    sdur: number[]
  }
  customs: Record<string, number>
  properties: Record<string, number>
  appliedFilters?: AnalyticsFilter[]
  timeBucket?: string[]
  meta?: { key: string; current: { sum: number; avg: number }; previous: { sum: number; avg: number } }[]
}

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
  chart?: { x: string[]; visits: number[] }
}

export interface AnalyticsParams {
  timeBucket: string
  period: string
  filters: AnalyticsFilter[]
  from?: string
  to?: string
  timezone: string
  mode?: 'periodical' | 'cumulative'
  password?: string
}

function serializeFiltersForUrl(filters: AnalyticsFilter[]): string {
  return JSON.stringify(filters)
}

export async function getProjectDataServer(
  request: Request,
  pid: string,
  params: AnalyticsParams,
): Promise<ServerFetchResult<TrafficLogResponse>> {
  const queryParams = new URLSearchParams({
    pid,
    timeBucket: params.timeBucket,
    period: params.period,
    filters: serializeFiltersForUrl(params.filters),
    from: params.from || '',
    to: params.to || '',
    timezone: params.timezone,
    mode: params.mode || 'periodical',
    metrics: '[]',
  })

  const headers: Record<string, string> = {}
  if (params.password) {
    headers['x-password'] = params.password
  }

  return serverFetch<TrafficLogResponse>(request, `log?${queryParams.toString()}`, { headers })
}

export async function getOverallStatsServer(
  request: Request,
  pids: string[],
  params: AnalyticsParams,
): Promise<ServerFetchResult<Record<string, OverallObject>>> {
  const pidsParam = `[${pids.map((pid) => `"${pid}"`).join(',')}]`

  const queryParams = new URLSearchParams({
    pids: pidsParam,
    timeBucket: params.timeBucket,
    period: params.period,
    from: params.from || '',
    to: params.to || '',
    timezone: params.timezone,
    filters: serializeFiltersForUrl(params.filters),
    includeChart: 'false',
  })

  const headers: Record<string, string> = {}
  if (params.password) {
    headers['x-password'] = params.password
  }

  return serverFetch<Record<string, OverallObject>>(request, `log/birdseye?${queryParams.toString()}`, { headers })
}

interface CustomEventsChartResponse {
  chart?: {
    events?: Record<string, unknown>
  }
}

export async function getCustomEventsDataServer(
  request: Request,
  pid: string,
  params: AnalyticsParams,
  customEvents: string[],
): Promise<ServerFetchResult<CustomEventsChartResponse>> {
  const queryParams = new URLSearchParams({
    pid,
    timeBucket: params.timeBucket,
    period: params.period,
    filters: serializeFiltersForUrl(params.filters),
    from: params.from || '',
    to: params.to || '',
    timezone: params.timezone,
    customEvents: JSON.stringify(customEvents),
  })

  const headers: Record<string, string> = {}
  if (params.password) {
    headers['x-password'] = params.password
  }

  return serverFetch<CustomEventsChartResponse>(request, `log/customEvents?${queryParams.toString()}`, { headers })
}

export interface PerformanceDataResponse {
  params: Record<string, { name: string; count: number }[]>
  chart: {
    x: string[]
    dns: number[]
    tls: number[]
    conn: number[]
    response: number[]
    render: number[]
    domLoad: number[]
    pageLoad: number[]
    ttfb: number[]
  }
  appliedFilters: AnalyticsFilter[]
  timeBucket?: string[]
}

export async function getPerfDataServer(
  request: Request,
  pid: string,
  params: AnalyticsParams & { measure?: string },
): Promise<ServerFetchResult<PerformanceDataResponse>> {
  const queryParams = new URLSearchParams({
    pid,
    timeBucket: params.timeBucket,
    period: params.period,
    filters: serializeFiltersForUrl(params.filters),
    from: params.from || '',
    to: params.to || '',
    timezone: params.timezone,
    measure: params.measure || '',
  })

  const headers: Record<string, string> = {}
  if (params.password) {
    headers['x-password'] = params.password
  }

  return serverFetch<PerformanceDataResponse>(request, `log/performance?${queryParams.toString()}`, { headers })
}

export interface PerformanceOverallObject {
  current: { frontend: number; backend: number; network: number }
  previous: { frontend: number; backend: number; network: number }
  frontendChange: number
  backendChange: number
  networkChange: number
}

export async function getPerformanceOverallStatsServer(
  request: Request,
  pids: string[],
  params: AnalyticsParams & { measure?: string },
): Promise<ServerFetchResult<Record<string, PerformanceOverallObject>>> {
  const pidsParam = `[${pids.map((pid) => `"${pid}"`).join(',')}]`

  const queryParams = new URLSearchParams({
    pids: pidsParam,
    period: params.period,
    from: params.from || '',
    to: params.to || '',
    timezone: params.timezone,
    filters: serializeFiltersForUrl(params.filters),
    measure: params.measure || '',
  })

  const headers: Record<string, string> = {}
  if (params.password) {
    headers['x-password'] = params.password
  }

  return serverFetch<Record<string, PerformanceOverallObject>>(
    request,
    `log/performance/birdseye?${queryParams.toString()}`,
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
}

export interface SessionsResponse {
  sessions: Session[]
  take: number
  skip: number
  appliedFilters: AnalyticsFilter[]
}

export async function getSessionsServer(
  request: Request,
  pid: string,
  params: AnalyticsParams & { take?: number; skip?: number },
): Promise<ServerFetchResult<SessionsResponse>> {
  const queryParams = new URLSearchParams({
    pid,
    period: params.period,
    filters: serializeFiltersForUrl(params.filters),
    from: params.from || '',
    to: params.to || '',
    timezone: params.timezone,
    take: String(params.take || 30),
    skip: String(params.skip || 0),
  })

  const headers: Record<string, string> = {}
  if (params.password) {
    headers['x-password'] = params.password
  }

  return serverFetch<SessionsResponse>(request, `log/sessions?${queryParams.toString()}`, { headers })
}

interface PageflowItem {
  type: 'pageview' | 'event' | 'error'
  value: string
  created: string
  metadata?: { key: string; value: string }[]
}

export interface SessionDetailsResponse {
  details: {
    psid: string
    cc: string | null
    os: string | null
    br: string | null
    dv: string | null
    pageviews: number
    customEvents: number
    errors: number
    revenue?: number
    refunds?: number
    created: string
    sdur?: number
    profileId: string | null
    isIdentified: 1 | 0
    isFirstSession: 1 | 0
  }
  chart?: {
    x: string[]
    pageviews?: number[]
    customEvents?: number[]
    errors?: number[]
  }
  pages?: PageflowItem[]
  timeBucket?: string
}

export async function getSessionServer(
  request: Request,
  pid: string,
  psid: string,
  timezone: string,
  password?: string,
): Promise<ServerFetchResult<SessionDetailsResponse>> {
  const queryParams = new URLSearchParams({
    pid,
    psid,
    timezone,
  })

  const headers: Record<string, string> = {}
  if (password) {
    headers['x-password'] = password
  }

  return serverFetch<SessionDetailsResponse>(request, `log/session?${queryParams.toString()}`, { headers })
}

interface SwetrixError {
  eid: string
  name: string
  message: string
  filename: string
  count: number
  last_seen: string
  status: 'active' | 'regressed' | 'fixed' | 'resolved'
  users: number
  sessions: number
}

export interface ErrorsResponse {
  errors: SwetrixError[]
}

export async function getErrorsServer(
  request: Request,
  pid: string,
  params: AnalyticsParams & { take?: number; skip?: number; options?: Record<string, unknown> },
): Promise<ServerFetchResult<ErrorsResponse>> {
  const queryParams = new URLSearchParams({
    pid,
    timeBucket: params.timeBucket,
    period: params.period,
    filters: serializeFiltersForUrl(params.filters),
    options: JSON.stringify(params.options || {}),
    from: params.from || '',
    to: params.to || '',
    timezone: params.timezone,
    take: String(params.take || 30),
    skip: String(params.skip || 0),
  })

  const headers: Record<string, string> = {}
  if (params.password) {
    headers['x-password'] = params.password
  }

  return serverFetch<ErrorsResponse>(request, `log/errors?${queryParams.toString()}`, { headers })
}

export interface ErrorDetailsResponse {
  details: {
    eid: string
    name: string
    message: string
    filename: string
    lineno: number
    colno: number
    count: number
    last_seen: string
    first_seen: string
    status: 'active' | 'regressed' | 'fixed' | 'resolved'
  }
  chart?: {
    x: string[]
    occurrences: number[]
    affectedUsers: number[]
  }
  params?: Record<string, { name: string; count: number }[]>
  metadata?: { key: string; value: string; count: number }[]
  timeBucket?: string
}

export async function getErrorServer(
  request: Request,
  pid: string,
  eid: string,
  params: AnalyticsParams & { options?: Record<string, unknown> },
): Promise<ServerFetchResult<ErrorDetailsResponse>> {
  const queryParams = new URLSearchParams({
    pid,
    eid,
    timeBucket: params.timeBucket,
    period: params.period,
    filters: serializeFiltersForUrl(params.filters),
    options: JSON.stringify(params.options || {}),
    from: params.from || '',
    to: params.to || '',
    timezone: params.timezone,
  })

  const headers: Record<string, string> = {}
  if (params.password) {
    headers['x-password'] = params.password
  }

  return serverFetch<ErrorDetailsResponse>(request, `log/error?${queryParams.toString()}`, { headers })
}

export interface ErrorOverviewResponse {
  chart?: {
    x: string[]
    occurrences: number[]
    affectedUsers: number[]
  }
  stats?: {
    totalErrors: number
    uniqueErrors: number
    affectedUsers: number
    errorRate?: number
    affectedSessions?: number
  }
  appliedFilters?: AnalyticsFilter[]
}

export async function getErrorOverviewServer(
  request: Request,
  pid: string,
  params: AnalyticsParams & { options?: Record<string, unknown> },
): Promise<ServerFetchResult<ErrorOverviewResponse>> {
  const queryParams = new URLSearchParams({
    pid,
    timeBucket: params.timeBucket,
    period: params.period,
    filters: serializeFiltersForUrl(params.filters),
    options: JSON.stringify(params.options || {}),
    from: params.from || '',
    to: params.to || '',
    timezone: params.timezone,
  })

  const headers: Record<string, string> = {}
  if (params.password) {
    headers['x-password'] = params.password
  }

  return serverFetch<ErrorOverviewResponse>(request, `log/error-overview?${queryParams.toString()}`, { headers })
}

// ============================================================================
// MARK: Feature Flags API (Deferred Loading)
// ============================================================================

interface TargetingRule {
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

  return serverFetch<FeatureFlagsResponse>(request, `feature-flag/project/${projectId}?${params.toString()}`)
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

  return serverFetch<FeatureFlagStats>(request, `feature-flag/${flagId}/stats?${params.toString()}`)
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
  if (resultFilter && resultFilter !== 'all') params.append('result', resultFilter)

  return serverFetch<FeatureFlagProfilesResponse>(request, `feature-flag/${flagId}/profiles?${params.toString()}`)
}

// ============================================================================
// MARK: Goals API (Deferred Loading)
// ============================================================================

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

export interface GoalsResponse {
  results: Goal[]
  total: number
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

  return serverFetch<GoalsResponse>(request, `goal/project/${projectId}?${params.toString()}`)
}

export interface GoalStats {
  conversions: number
  uniqueSessions: number
  conversionRate: number
  previousConversions: number
  trend: number
}

export async function getGoalStatsServer(
  request: Request,
  goalId: string,
  period: string,
  from = '',
  to = '',
  timezone?: string,
): Promise<ServerFetchResult<GoalStats>> {
  const params = new URLSearchParams({ period })
  if (from) params.append('from', from)
  if (to) params.append('to', to)
  if (timezone) params.append('timezone', timezone)

  return serverFetch<GoalStats>(request, `goal/${goalId}/stats?${params.toString()}`)
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
): Promise<ServerFetchResult<{ chart: GoalChartData }>> {
  const params = new URLSearchParams({ period, timeBucket })
  if (from) params.append('from', from)
  if (to) params.append('to', to)
  if (timezone) params.append('timezone', timezone)

  return serverFetch<{ chart: GoalChartData }>(request, `goal/${goalId}/chart?${params.toString()}`)
}

// ============================================================================
// MARK: Alerts API (Deferred Loading)
// ============================================================================

type QueryMetric = 'page_views' | 'unique_page_views' | 'online_users' | 'custom_events' | 'errors'
type QueryCondition = 'greater_than' | 'greater_equal_than' | 'less_than' | 'less_equal_than'
type QueryTime =
  | 'last_15_minutes'
  | 'last_30_minutes'
  | 'last_1_hour'
  | 'last_4_hours'
  | 'last_24_hours'
  | 'last_48_hours'

interface Alert {
  id: string
  name: string
  active: boolean
  queryMetric: QueryMetric
  queryCondition: QueryCondition | null
  queryValue: number | null
  queryTime: QueryTime | null
  queryCustomEvent: string | null
  lastTriggered: string | null
  alertOnNewErrorsOnly: boolean
  alertOnEveryCustomEvent: boolean
  pid: string
  created: string
}

export interface AlertsResponse {
  results: Alert[]
  total: number
}

export async function getProjectAlertsServer(
  request: Request,
  projectId: string,
  take = 25,
  skip = 0,
): Promise<ServerFetchResult<AlertsResponse>> {
  const params = new URLSearchParams({
    take: String(take),
    skip: String(skip),
  })

  return serverFetch<AlertsResponse>(request, `alert/project/${projectId}?${params.toString()}`)
}

// ============================================================================
// MARK: Funnels API (Deferred Loading)
// ============================================================================

interface AnalyticsFunnelStep {
  value: string
  events: number
  eventsPerc: number
  eventsPercStep: number
  dropoff: number
  dropoffPerc: number
  dropoffPercStep: number
}

export interface FunnelDataResponse {
  funnel: AnalyticsFunnelStep[]
  totalPageviews: number
}

export async function getFunnelDataServer(
  request: Request,
  pid: string,
  funnelId: string,
  period: string,
  from: string,
  to: string,
  timezone: string,
  password?: string,
): Promise<ServerFetchResult<FunnelDataResponse>> {
  const queryParams = new URLSearchParams({
    pid,
    period,
    from,
    to,
    timezone,
    funnelId,
  })

  const headers: Record<string, string> = {}
  if (password) {
    headers['x-password'] = password
  }

  return serverFetch<FunnelDataResponse>(request, `log/funnel?${queryParams.toString()}`, { headers })
}

// ============================================================================
// MARK: Captcha API (Deferred Loading)
// ============================================================================

interface CaptchaPanelData {
  name: string
  count: number
  cc?: string
}

interface CaptchaChartData {
  x: string[]
  results: number[]
}

export interface CaptchaDataResponse {
  params: Record<string, CaptchaPanelData[]>
  chart?: CaptchaChartData
}

export async function getCaptchaDataServer(
  request: Request,
  pid: string,
  timeBucket = 'hour',
  period = '3d',
  filters: AnalyticsFilter[] = [],
  from = '',
  to = '',
  password?: string,
): Promise<ServerFetchResult<CaptchaDataResponse>> {
  const queryParams = new URLSearchParams({
    pid,
    timeBucket,
    period,
    filters: JSON.stringify(filters),
    from,
    to,
  })

  const headers: Record<string, string> = {}
  if (password) {
    headers['x-password'] = password
  }

  return serverFetch<CaptchaDataResponse>(request, `log/captcha?${queryParams.toString()}`, { headers })
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
}

export async function getExperimentResultsServer(
  request: Request,
  experimentId: string,
  period: string,
  timeBucket: string,
  from = '',
  to = '',
  timezone?: string,
): Promise<ServerFetchResult<ExperimentResults>> {
  const params = new URLSearchParams({ period, timeBucket })
  if (from) params.append('from', from)
  if (to) params.append('to', to)
  if (timezone) params.append('timezone', timezone)

  return serverFetch<ExperimentResults>(request, `experiment/${experimentId}/results?${params.toString()}`)
}

export async function getGoalServer(request: Request, goalId: string): Promise<ServerFetchResult<Goal>> {
  return serverFetch<Goal>(request, `goal/${goalId}`)
}

// ============================================================================
// MARK: Profiles API (Deferred Loading)
// ============================================================================

interface Profile {
  id: string
  isAnonymous: boolean
  created: string
  pageviews: number
  sessions: number
  customEvents: number
  errors: number
  revenue?: number
  refunds?: number
  revenueCurrency?: string
  lastSeen: string
  country?: string
  city?: string
  region?: string
  properties?: Record<string, unknown>
}

export interface ProfilesResponse {
  profiles: Profile[]
}

export async function getProfilesServer(
  request: Request,
  pid: string,
  period = '3d',
  filters: AnalyticsFilter[] = [],
  from = '',
  to = '',
  take = 30,
  skip = 0,
  timezone = '',
  profileType: 'all' | 'anonymous' | 'identified' = 'all',
  password?: string,
): Promise<ServerFetchResult<ProfilesResponse>> {
  const params = new URLSearchParams({
    pid,
    take: String(take),
    skip: String(skip),
    period,
    filters: JSON.stringify(filters),
    from,
    to,
    timezone,
    profileType,
  })

  const headers: Record<string, string> = {}
  if (password) {
    headers['x-password'] = password
  }

  return serverFetch<ProfilesResponse>(request, `log/profiles?${params.toString()}`, { headers })
}

interface ProfileDetails {
  profileId: string
  isAnonymous: boolean
  created: string
  pageviews: number
  sessions: number
  customEvents: number
  errors: number
  revenue?: number
  refunds?: number
  revenueCurrency?: string
  lastSeen: string
  country?: string
  city?: string
  region?: string
  locale?: string
  os?: string
  browser?: string
  device?: string
  properties?: Record<string, unknown>
  eventsInPeriod?: number
  sessionsInPeriod?: number
}

export interface ProfileDetailsResponse extends ProfileDetails {
  chart: unknown
  timeBucket: string
}

export async function getProfileServer(
  request: Request,
  pid: string,
  profileId: string,
  period = '7d',
  from = '',
  to = '',
  timezone = '',
  password?: string,
): Promise<ServerFetchResult<ProfileDetailsResponse>> {
  const params = new URLSearchParams({
    pid,
    profileId: encodeURIComponent(profileId),
    period,
    from,
    to,
    timezone,
  })

  const headers: Record<string, string> = {}
  if (password) {
    headers['x-password'] = password
  }

  return serverFetch<ProfileDetailsResponse>(request, `log/profile?${params.toString()}`, { headers })
}

interface ProfileSession {
  psid: string
  cc: string | null
  os: string | null
  br: string | null
  dv: string | null
  pageviews: number
  customEvents: number
  errors: number
  revenue?: number
  refunds?: number
  created: string
  duration?: number
  active?: boolean
  isLive?: boolean
}

export interface ProfileSessionsResponse {
  sessions: ProfileSession[]
}

export async function getProfileSessionsServer(
  request: Request,
  pid: string,
  profileId: string,
  period = '3d',
  filters: AnalyticsFilter[] = [],
  from = '',
  to = '',
  take = 30,
  skip = 0,
  timezone = '',
  password?: string,
): Promise<ServerFetchResult<ProfileSessionsResponse>> {
  const params = new URLSearchParams({
    pid,
    profileId: encodeURIComponent(profileId),
    take: String(take),
    skip: String(skip),
    period,
    filters: JSON.stringify(filters),
    from,
    to,
    timezone,
  })

  const headers: Record<string, string> = {}
  if (password) {
    headers['x-password'] = password
  }

  return serverFetch<ProfileSessionsResponse>(request, `log/profile/sessions?${params.toString()}`, { headers })
}
