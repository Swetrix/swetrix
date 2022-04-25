import { types } from 'redux/actions/ui/types'
import _filter from 'lodash/filter'
import _isEmpty from 'lodash/isEmpty'

import { getProjectCacheKey, LS_VIEW_PREFS_SETTING } from 'redux/constants'

export const getInitialViewPrefs = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    const storedPrefs = window.localStorage.getItem(LS_VIEW_PREFS_SETTING)
    if (typeof storedPrefs === 'string') {
      try {
        return JSON.parse(storedPrefs)
      } catch (e) {
        window.localStorage.removeItem(LS_VIEW_PREFS_SETTING)
      }
    }
  }

  return {}
}

const getInitialState = () => {
  return {
    // { pid: { 'period + timeBucket': { ... }, ... }, ... }
    // example: { 'FSMaC9V4HFLA': { '4wday': { }, '7dhour': { } } }
    analytics: {},

    // { pid: { period: '7d', timeBucket: 'day' }, ... }
    projectViewPrefs: getInitialViewPrefs(),
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
        if (_isEmpty(pid)) {
          return {
            ...state,
            analytics: {},
          }
        } else {
          return {
            ...state,
            analytics: _filter(state.analytics, (project) => project !== pid),
          }
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
