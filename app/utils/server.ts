export const hasAuthCookies = (request: Request) => {
  const cookie = request.headers.get('Cookie')
  const accessToken = cookie?.match(/(?<=access_token=)[^;]*/)?.[0]
  const refreshToken = cookie?.match(/(?<=refresh_token=)[^;]*/)?.[0]

  return accessToken && refreshToken
}

export function detectTheme(request: Request): 'dark' | 'light' {
  const cookie = request.headers.get('Cookie')
  const theme = cookie?.match(/(?<=colour-theme=)[^;]*/)?.[0]

  if (theme === 'dark') {
    return 'dark'
  }

  return 'light'
}
