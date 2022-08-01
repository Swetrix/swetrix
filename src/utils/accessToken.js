import _isEmpty from 'lodash/isEmpty'
import { TOKEN } from 'redux/constants'
import { getItem, setItem, removeItem } from './localstorage'

// It's important to first check in local storage, then in session storage, not vice versa.
export const getAccessToken = () => {
  let accessToken = getItem(TOKEN)

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

  setItem(TOKEN, token)
}

export const removeAccessToken = () => {
  removeItem(TOKEN)
  sessionStorage.removeItem(TOKEN)
}
