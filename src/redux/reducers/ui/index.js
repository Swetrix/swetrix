import { combineReducers } from 'redux'
import projects from './projects'
import cache from './cache'
import theme from './theme'
import misc from './misc'

export default combineReducers({
  projects, cache, theme, misc,
})
