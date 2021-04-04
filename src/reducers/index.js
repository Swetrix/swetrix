import { combineReducers } from 'redux'
import auth from './auth'
import errors from './errors'
import alerts from './alerts'

export default combineReducers({ auth, errors, alerts })