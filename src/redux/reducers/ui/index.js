import { combineReducers } from 'redux'
import projects from './projects'
import cache from './cache'
import theme from './theme'

export default combineReducers({ projects, cache, theme })
