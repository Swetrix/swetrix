import { types } from 'redux/actions/ui/types'
import _filter from 'lodash/filter'
import _isEmpty from 'lodash/isEmpty'

import { getProjectCacheKey, getProjectForcastCacheKey, LS_VIEW_PREFS_SETTING } from 'redux/constants'

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

    analyticsPerf: {},

    // { pid: { period: '7d', timeBucket: 'day' }, ... }
    projectViewPrefs: getInitialViewPrefs(),
  }
}

// eslint-disable-next-line default-param-last
const cacheReducer = (state = getInitialState(), { type, payload }) => {
  switch (type) {
    case types.SET_PROJECT_CACHE: {
      const { pid, data, key } = payload

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
        }

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
      const {
        pid, period, timeBucket, rangeDate,
      } = payload

      return {
        ...state,
        projectViewPrefs: {
          ...state.projectViewPrefs,
          [pid]: rangeDate ? {
            period, timeBucket, rangeDate,
          } : {
            period, timeBucket,
          },
        },
      }
    }

    case types.SET_PROJECT_CACHE_PERF: {
      const { pid, data, key } = payload

      return {
        ...state,
        analyticsPerf: {
          ...state.analyticsPerf,
          [pid]: {
            ...state.analyticsPerf[pid],
            [key]: data,
          },
        },
      }
    }

    case types.DELETE_PROJECT_CACHE_PERF: {
      const { pid, period, timeBucket } = payload
      const key = getProjectCacheKey(period, timeBucket)

      if (_isEmpty(period) || _isEmpty(timeBucket)) {
        if (_isEmpty(pid)) {
          return {
            ...state,
            analyticsPerf: {},
          }
        }

        return {
          ...state,
          analyticsPerf: _filter(state.analyticsPerf, (project) => project !== pid),
        }
      }

      return {
        ...state,
        analyticsPerf: {
          ...state.analyticsPerf,
          [pid]: _filter(state.analyticsPerf[pid], (ckey) => ckey !== key),
        },
      }
    }

    case types.SET_PROJECT_FORECAST_CACHE: {
      const { pid, data, key } = payload

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

    default:
      return state
  }
}

export default cacheReducer
