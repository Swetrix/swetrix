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
