import { combineReducers } from 'redux'
import projects from './projects'
import cache from './cache'

export default combineReducers({ projects, cache })
