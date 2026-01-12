import { redirect } from 'react-router'

const ACCESS_TOKEN_COOKIE = 'access_token'
const REFRESH_TOKEN_COOKIE = 'refresh_token'

const PERSISTENT_COOKIE_MAX_AGE = 8467200 // 14 weeks in seconds

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

function getCookieDomain(): string | undefined {
  const domain = process.env.COOKIE_DOMAIN

  // In development or selfhosted without explicit domain, don't set domain
  // TODO: Eventually we should support this variable for selfhosted Swetrix as well
  if (!domain || process.env.NODE_ENV === 'development' || process.env.__SELFHOSTED) {
    return undefined
  }

  return domain
}

function isSecureCookie(): boolean {
  // TODO: Eventually we should support this variable for selfhosted Swetrix as well
  return process.env.NODE_ENV === 'production' && !process.env.__SELFHOSTED
}

function parseCookies(request: Request): Record<string, string> {
  const cookieHeader = request.headers.get('Cookie')
  if (!cookieHeader) return {}

  const cookies: Record<string, string> = {}
  for (const cookie of cookieHeader.split(';')) {
    const [name, ...valueParts] = cookie.trim().split('=')
    if (name) {
      const rawValue = valueParts.join('=')
      try {
        cookies[name] = decodeURIComponent(rawValue)
      } catch {
        cookies[name] = rawValue
      }
    }
  }
  return cookies
}

export function getAccessToken(request: Request): string | null {
  const cookies = parseCookies(request)
  return cookies[ACCESS_TOKEN_COOKIE] || null
}

export function getRefreshToken(request: Request): string | null {
  const cookies = parseCookies(request)
  return cookies[REFRESH_TOKEN_COOKIE] || null
}

export function isPersistentSession(request: Request): boolean {
  const cookies = parseCookies(request)
  return cookies['is_persistent'] === 'true'
}

export function hasAuthTokens(request: Request): boolean {
  return !!getAccessToken(request) || !!getRefreshToken(request)
}

export function redirectIfNotAuthenticated(request: Request, redirectTo = '/login'): Response | null {
  if (hasAuthTokens(request)) {
    return null
  }

  throw redirect(redirectTo, {
    headers: createHeadersWithCookies(clearAuthCookies()),
  })
}

function buildCookieHeader(
  name: string,
  value: string,
  options: {
    maxAge?: number // undefined = session cookie (expires on browser close)
    path?: string
    sameSite?: 'Strict' | 'Lax' | 'None'
    secure?: boolean
    httpOnly?: boolean
    domain?: string
  } = {},
): string {
  const {
    maxAge,
    path = '/',
    sameSite = 'Strict',
    secure = isSecureCookie(),
    httpOnly = true,
    domain = getCookieDomain(),
  } = options

  let cookie = `${name}=${encodeURIComponent(value)}; Path=${path}; SameSite=${sameSite}`

  // Only add Max-Age for persistent cookies
  // Session cookies (remember=false) should NOT have Max-Age
  if (maxAge !== undefined) {
    cookie += `; Max-Age=${maxAge}`
  }

  if (secure) {
    cookie += '; Secure'
  }

  if (httpOnly) {
    cookie += '; HttpOnly'
  }

  if (domain) {
    cookie += `; Domain=${domain}`
  }

  return cookie
}

export function createAuthCookies(tokens: AuthTokens, remember: boolean): string[] {
  const maxAge = remember ? PERSISTENT_COOKIE_MAX_AGE : undefined

  const cookies = [
    buildCookieHeader(ACCESS_TOKEN_COOKIE, tokens.accessToken, { maxAge }),
    buildCookieHeader(REFRESH_TOKEN_COOKIE, tokens.refreshToken, { maxAge }),
  ]

  if (remember) {
    cookies.push(buildCookieHeader('is_persistent', 'true', { maxAge: PERSISTENT_COOKIE_MAX_AGE }))
  }

  return cookies
}

/**
 * @returns Array of Set-Cookie header values that expire the cookies
 */
export function clearAuthCookies(): string[] {
  const domain = getCookieDomain()

  // Clear with and without domain to ensure both are removed
  const cookies = [
    `${ACCESS_TOKEN_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`,
    `${REFRESH_TOKEN_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`,
  ]

  if (domain) {
    cookies.push(`${ACCESS_TOKEN_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax; Domain=${domain}`)
    cookies.push(`${REFRESH_TOKEN_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax; Domain=${domain}`)
  }

  return cookies
}

function appendCookiesToHeaders(headers: Headers, cookies: string[]): Headers {
  for (const cookie of cookies) {
    headers.append('Set-Cookie', cookie)
  }
  return headers
}

export function createHeadersWithCookies(cookies: string[]): Headers {
  const headers = new Headers()
  return appendCookiesToHeaders(headers, cookies)
}

const PROJECT_PASSWORD_COOKIE_PREFIX = 'swx_pp_'
const PROJECT_PASSWORD_MAX_AGE = 604800 // 1 week in seconds

export function getProjectPasswordCookie(request: Request, projectId: string): string | null {
  const cookies = parseCookies(request)
  return cookies[`${PROJECT_PASSWORD_COOKIE_PREFIX}${projectId}`] || null
}

export function createProjectPasswordCookie(projectId: string, password: string): string {
  return buildCookieHeader(`${PROJECT_PASSWORD_COOKIE_PREFIX}${projectId}`, password, {
    maxAge: PROJECT_PASSWORD_MAX_AGE,
    sameSite: 'Lax',
  })
}
