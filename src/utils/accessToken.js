import { TOKEN } from 'redux/constants'
import { setCookie, getCookie } from './cookie'

export const getAccessToken = () => {
  return getCookie(TOKEN)
}

export const setAccessToken = (token) => {
  setCookie(TOKEN, token)
}

export const removeAccessToken = () => {
  setCookie(TOKEN, '', 0)
  sessionStorage.removeItem(TOKEN)
}
