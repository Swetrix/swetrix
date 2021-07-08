export const getAccessToken = () => {
  const accessToken = localStorage.getItem('access_token')
  let token = null

  if (!accessToken) {
    return null
  }

  try {
    token = JSON.parse(accessToken)
  } catch(e) {
    console.error('Error while parsing access token: ' + e)
  }

  return token
}

export const setAccessToken = token => {
  localStorage.setItem('access_token', token)
}

export const removeAccessToken = () => {
  localStorage.removeItem('access_token')
}
