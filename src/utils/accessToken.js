import { getItem, setItem, removeItem } from './localstorage'
import { TOKEN } from 'redux/constants'

export const getAccessToken = () => {
  const accessToken = getItem(TOKEN)
  return accessToken
}

export const setAccessToken = token => {
  setItem(TOKEN, token)
}

export const removeAccessToken = () => {
  removeItem(TOKEN)
}
