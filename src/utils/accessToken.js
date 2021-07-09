import Debug from 'debug'
import { getItem, setItem, removeItem } from './localstorage'

const debug = Debug('analytics:utils:at')

export const getAccessToken = () => {
  const accessToken = getItem('access_token')
  let token = null

  if (!accessToken) {
    return null
  }

  try {
    token = JSON.parse(accessToken)
  } catch(e) {
    debug('Error while parsing access token: %s', e)
  }

  return token
}

export const setAccessToken = token => {
  setItem('access_token', token)
}

export const removeAccessToken = () => {
  removeItem('access_token')
}
