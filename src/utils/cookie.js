const COOKIE_DOMAIN = 'swetrix.com'

export const getCookie = key => {
  const match = document.cookie.match(new RegExp(`(^| )${key}=([^;]+)`))

  if (match) {
    return match[2]
  }

  return null
}

export const setCookie = (key, value, maxAge = 3600, sameSite = 'strict') => {
  document.cookie = `${key}=${value}; max-age=${maxAge}; path=/; domain=${COOKIE_DOMAIN} SameSite=${sameSite}; secure`
}

export const deleteCookie = (key) => {
  document.cookie = `${key}=; max-age=0; path=/; SameSite=strict`
}
