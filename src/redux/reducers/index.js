import { combineReducers } from 'redux'
import auth from './auth'
import errors from './errors'
import alerts from './alerts'
import ui from './ui'

export default combineReducers({ auth, errors, alerts, ui })