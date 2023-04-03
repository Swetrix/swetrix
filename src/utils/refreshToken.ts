import { REFRESH_TOKEN } from 'redux/constants'
import { getCookie, setCookie, deleteCookie } from './cookie'

// 14 weeks in seconds
const STORE_REFRESH_TOKEN_FOR = 8467200

export const getRefreshToken = () => {
  return getCookie(REFRESH_TOKEN)
}

export const setRefreshToken = (token: string) => {
  setCookie(REFRESH_TOKEN, token, STORE_REFRESH_TOKEN_FOR)
}

export const removeRefreshToken = () => {
  deleteCookie(REFRESH_TOKEN)
}
