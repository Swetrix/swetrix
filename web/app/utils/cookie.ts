import { isDevelopment, isSelfhosted, isBrowser, COOKIE_DOMAIN } from '~/lib/constants'

const COOKIE_SUFFIX = isDevelopment || isSelfhosted ? '' : `; domain=${COOKIE_DOMAIN}; secure`

export const getCookie = (key: string) => {
  if (!isBrowser) {
    return null
  }

  const match = document.cookie.match(new RegExp(`(^| )${key}=([^;]+)`))

  if (match) {
    return match[2]
  }

  return null
}

export const generateCookieString = (
  key: string,
  value: string | number | boolean,
  maxAge = 3600,
  sameSite = 'strict',
) => {
  return `${key}=${value}; max-age=${maxAge}; path=/; SameSite=${sameSite}${COOKIE_SUFFIX}`
}

export const setCookie = (key: string, value: string | number | boolean, maxAge = 3600, sameSite = 'strict') => {
  if (!isBrowser) {
    return null
  }

  document.cookie = generateCookieString(key, value, maxAge, sameSite)
}

export const deleteCookie = (key: string) => {
  if (!isBrowser) {
    return null
  }

  document.cookie = `${key}=; max-age=0; path=/; SameSite=strict`
  document.cookie = `${key}=; max-age=0; path=/; SameSite=strict${COOKIE_SUFFIX}`
}
