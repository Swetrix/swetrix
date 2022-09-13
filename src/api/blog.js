/* eslint-disable implicit-arrow-linebreak */
import axios from 'axios'
import Debug from 'debug'
import _isEmpty from 'lodash/isEmpty'
import { isSelfhosted } from 'redux/constants'

const debug = Debug('swetrix:api')

const api = axios.create({
  baseURL: isSelfhosted ? window.env.BLOG_API_URL : process.env.REACT_APP_BLOG_API_URL,
})

// api.interceptors.request.use(
//   (config) => {
//     const token = getAccessToken()
//     if (token) {
//       // eslint-disable-next-line no-param-reassign
//       config.headers.Authorization = `Bearer ${token}`
//     }
//     return config
//   },
//   (error) => {
//     return Promise.reject(error)
//   },
// )

// api.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     if (error.response?.data.statusCode === 401) {
//       removeAccessToken()
//       store.dispatch(authActions.logout())
//     }
//     return Promise.reject(error)
//   },
// )

export const getLastPost = () =>
  api
    .get('last-post?format=json')
    .then((response) => response.data)
    .catch((error) => {
      debug('%s', error)
      throw _isEmpty(error.response.data?.message)
        ? error.response.data
        : error.response.data.message
    })
