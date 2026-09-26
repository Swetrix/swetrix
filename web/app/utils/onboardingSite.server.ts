import { extractDomain } from '~/utils/url'

/**
 * The landing hero -> signup -> onboarding handoff.
 *
 * When a visitor types their website into the hero (the `variant` arm of the
 * hero signup experiment), the signup loader parks the domain in this
 * short-lived cookie and strips it from the URL. The onboarding loader reads it
 * back to prefill the "create your first project" step, so nobody is asked for
 * their website twice. A cookie (rather than a query param) is what survives
 * the SSO popup round-trip and the POST-redirect of the email signup form.
 */
const COOKIE_NAME = 'swx_onboarding_site'
const MAX_AGE = 60 * 60 // 1 hour - long enough for a signup, short enough to not linger

const isSecureCookie = () =>
  process.env.NODE_ENV === 'production' && !process.env.__SELFHOSTED

const parseCookies = (request: Request): Record<string, string> => {
  const cookieHeader = request.headers.get('Cookie')

  if (!cookieHeader) {
    return {}
  }

  const cookies: Record<string, string> = {}

  for (const cookie of cookieHeader.split(';')) {
    const [name, ...valueParts] = cookie.trim().split('=')

    if (!name) {
      continue
    }

    const rawValue = valueParts.join('=')

    try {
      cookies[name] = decodeURIComponent(rawValue)
    } catch {
      cookies[name] = rawValue
    }
  }

  return cookies
}

/** Narrow whatever the visitor typed down to a usable domain, or null. */
export const onboardingDomainFrom = (raw: string | null | undefined) =>
  extractDomain(raw)

/** The handoff domain, re-validated on the way out (we don't trust the jar). */
export const readOnboardingSite = (request: Request) =>
  onboardingDomainFrom(parseCookies(request)[COOKIE_NAME])

export const createOnboardingSiteCookie = (domain: string) => {
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(domain)}`,
    'Path=/',
    'SameSite=Lax',
    `Max-Age=${MAX_AGE}`,
    'HttpOnly',
  ]

  if (isSecureCookie()) {
    parts.push('Secure')
  }

  return parts.join('; ')
}

export const clearOnboardingSiteCookie = () =>
  `${COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly`
