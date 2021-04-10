import axios from 'axios'
import { store } from 'store'
import { authActions } from 'actions/auth'
import { getAccessToken, removeAccessToken } from "utils/accessToken"

const NET_CONNECT_ERR = 'Internet connection error'

const api = axios.create({
	baseURL: process.env.REACT_APP_API_URL,
})

api.interceptors.request.use(
	(config) => {
		const token = getAccessToken()
		if (token) {
			config.headers['Authorization'] = `Bearer ${token}`
		}
		return config
	},
	(error) => {
		return Promise.reject(error)
	}
)

api.interceptors.response.use(
	(response) => response,
	(error) => {
		if (error.response.data.statusCode === 401) {
			removeAccessToken()
			store.dispatch(authActions.logout())
		}
		return Promise.reject(error)
	}
)

export const authMe = () =>
	api
		.get('/auth/me')
		.then((response) => response.data)
		.catch((error) => {
			throw new Error(error?.response?.data?.message || NET_CONNECT_ERR)
		})

export const login = (credentials) =>
	api
		.post('/auth/login', credentials)
		.then((response) => response.data)
		.catch((error) => {
			throw new Error(error?.response?.data?.message || NET_CONNECT_ERR)
		})

export const signup = (data) =>
	api
		.post('/auth/register', data)
		.then((response) => response.data)
		.catch((error) => {
			const errorsArray = error?.response?.data?.message || NET_CONNECT_ERR
			if (Array.isArray(errorsArray)) {
				throw errorsArray
			}
			throw new Error(errorsArray)
		})

export const deleteUser = () =>
	api
		.delete('/user')
		.then((response) => response.data)
		.catch((error) => {
			throw new Error(JSON.stringify(error.response.data))
		})

export const changeUserDetails = (data) =>
	api
		.put('/user', data)
		.then((response) => response.data)
		.catch((error) => {
			const errorsArray = error?.response?.data?.message || NET_CONNECT_ERR
			if (Array.isArray(errorsArray)) {
				throw errorsArray
			}
			throw new Error(errorsArray)
		})

export const forgotPassword = (email) =>
	api
		.post('/auth/reset-password', email)
		.then((response) => response.data)
		.catch((error) => {
			throw new Error(error?.response?.data?.message || NET_CONNECT_ERR)
		})

export const confirmEmail = () =>
	api
		.post('/user/confirm_email')
		.then(response => response.data)
		.catch(error => {
			throw new Error(error?.response?.data?.message || NET_CONNECT_ERR)
		})

export const exportUserData = () =>
	api
		.get('/user/export')
		.then(response => response.data)
		.catch(error => {
			throw new Error(error?.response?.data?.message || NET_CONNECT_ERR)
		})

export const createNewPassword = (id, password) =>
	api
		.post(`/auth/password-reset/${id}`, { password })
		.then((response) => response.data)
		.catch((error) => {
			const errorsArray = error?.response?.data?.message || NET_CONNECT_ERR
			if (Array.isArray(errorsArray)) {
				throw errorsArray
			}
			throw new Error(errorsArray)
		})

export const verifyEmail = ({ path, id }) =>
	api
		.get(`/auth/${path}/${id}`)
		.then((response) => response.data)
		.catch((error) => {
			throw new Error(error?.response?.data?.message || NET_CONNECT_ERR)
		})