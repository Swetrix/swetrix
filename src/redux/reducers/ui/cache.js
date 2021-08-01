import { types } from 'redux/actions/ui/types'
import _filter from 'lodash/filter'
import _isEmpty from 'lodash/isEmpty'

import { getProjectCacheKey } from 'redux/constants'

const getInitialState = () => {
  return {
    // { pid: { 'period + timeBucket': { ... }, ... }, ... }
    // example: { 'FSMaC9V4HFLA': { '4wday': { }, '7dhour': { } } }
    analytics: {},

    // { pid: { period: '7d', timeBucket: 'day' }, ... }
    projectViewPrefs: {},
  }
}

const cacheReducer = (state = getInitialState(), { type, payload }) => {
  switch (type) {
    case types.SET_PROJECT_CACHE: {
      const { pid, period, timeBucket, data } = payload
      const key = getProjectCacheKey(period, timeBucket)

      return {
        ...state,
        analytics: {
          ...state.analytics,
          [pid]: {
            ...state.analytics[pid],
            [key]: data,
          },
        },
      }
    }

    case types.DELETE_PROJECT_CACHE: {
      const { pid, period, timeBucket } = payload
      const key = getProjectCacheKey(period, timeBucket)

      if (_isEmpty(period) || _isEmpty(timeBucket)) {
        return {
          ...state,
          analytics: _filter(state.analytics, (project) => project !== pid),
        }
      }

      return {
        ...state,
        analytics: {
          ...state.analytics,
          [pid]: _filter(state.analytics[pid], (ckey) => ckey !== key),
        },
      }
    }

    case types.SET_PROJECT_VIEW_PREFS: {
      const { pid, period, timeBucket } = payload

      return {
        ...state,
        projectViewPrefs: {
          ...state.projectViewPrefs,
          [pid]: {
            period, timeBucket,
          },
        },
      }
    }

    default:
      return state
  }
}

export default cacheReducer
