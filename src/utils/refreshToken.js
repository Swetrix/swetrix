import _isEmpty from 'lodash/isEmpty'
import { REFRESH_TOKEN } from 'redux/constants'
import { getCookie, setCookie } from './cookie'

// 14 weeks in seconds
const STORE_REFRESH_TOKEN_FOR = 8467200

export const getRefreshToken = () => {
  return getCookie(REFRESH_TOKEN)
}

export const setRefreshToken = (token) => {
  setCookie(REFRESH_TOKEN, token, STORE_REFRESH_TOKEN_FOR)
}

export const removeRefreshToken = () => {
  setCookie(REFRESH_TOKEN, '', 0)
}
