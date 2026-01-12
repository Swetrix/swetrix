import { REFRESH_TOKEN, isBrowser } from '~/lib/constants'

import { setCookie } from './cookie'

// 14 weeks in seconds
const STORE_REFRESH_TOKEN_FOR = 8467200

export const setRefreshToken = (token: string, temporary = false) => {
  if (!isBrowser) {
    return null
  }

  if (temporary) {
    sessionStorage.setItem(REFRESH_TOKEN, token)
    return
  }

  setCookie(REFRESH_TOKEN, token, STORE_REFRESH_TOKEN_FOR)
}
