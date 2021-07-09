export const getCookie = key => {
  const match = document.cookie.match(new RegExp('(^| )' + key + '=([^;]+)'))
  if (match) return match[2]
}

export const setCookie = (key, value, maxAge = 3600) => {
  document.cookie = `${key}=${value}; max-age=${maxAge}; path=/`
}
