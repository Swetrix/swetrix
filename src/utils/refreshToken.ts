import _isEmpty from 'lodash/isEmpty'

import { REFRESH_TOKEN } from 'redux/constants'
import { getCookie, setCookie, deleteCookie } from './cookie'

// 14 weeks in seconds
const STORE_REFRESH_TOKEN_FOR = 8467200

export const getRefreshToken = () => {
  let refreshToken = getCookie(REFRESH_TOKEN)

  if (_isEmpty(refreshToken)) {
    refreshToken = sessionStorage.getItem(REFRESH_TOKEN)
  }

  return refreshToken
}

export const setRefreshToken = (token: string, temporary: boolean = false) => {
  if (temporary) {
    sessionStorage.setItem(REFRESH_TOKEN, token)
    return
  }

  setCookie(REFRESH_TOKEN, token, STORE_REFRESH_TOKEN_FOR)
}

export const removeRefreshToken = () => {
  deleteCookie(REFRESH_TOKEN)
  sessionStorage.removeItem(REFRESH_TOKEN)
}
