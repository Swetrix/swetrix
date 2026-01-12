import { TOKEN, isBrowser } from '~/lib/constants'

import { setCookie } from './cookie'

// 14 weeks in seconds
const STORE_AUTH_TOKEN_FOR = 8467200

export const setAccessToken = (token: string, temporary = false) => {
  if (!isBrowser) {
    return null
  }

  if (temporary) {
    sessionStorage.setItem(TOKEN, token)
    return null
  }

  setCookie(TOKEN, token, STORE_AUTH_TOKEN_FOR)
}
