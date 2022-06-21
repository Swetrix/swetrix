import _isEmpty from 'lodash/isEmpty'
import { TOKEN } from 'redux/constants'
import { getCookie, setCookie } from './cookie'

// It's important to first check in local storage, then in session storage, not vice versa.
export const getAccessToken = () => {
  let accessToken = getCookie(TOKEN)

  if (_isEmpty(accessToken)) {
    accessToken = sessionStorage.getItem(TOKEN)
  }

  return accessToken
}

export const setAccessToken = (token, temporary = false) => {
  if (temporary) {
    sessionStorage.setItem(TOKEN, token)
    return
  }

  setCookie(TOKEN, token)
}

export const removeAccessToken = () => {
  setCookie(TOKEN, '', 0)
  sessionStorage.removeItem(TOKEN)
}
