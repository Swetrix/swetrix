import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import _filter from 'lodash/filter'
import _isEmpty from 'lodash/isEmpty'
import {
  getProjectCacheKey, LS_VIEW_PREFS_SETTING, LS_CAPTCHA_VIEW_PREFS_SETTING, getProjectCaptchaCacheKey,
} from 'redux/constants'

export const getInitialViewPrefs = (LS_VIEW: string) => {
  if (typeof window !== 'undefined' && window.localStorage) {
    const storedPrefs = window.localStorage.getItem(LS_VIEW)
    if (typeof storedPrefs === 'string') {
      try {
        return JSON.parse(storedPrefs)
      } catch (e) {
        window.localStorage.removeItem(LS_VIEW)
      }
    }
  }

  return {}
}
// analytics: {},

// analyticsPerf: {},

// captchaAnalytics: {},

// captchaProjectsViewPrefs: getInitialViewPrefs(LS_CAPTCHA_VIEW_PREFS_SETTING),

// // { pid: { period: '7d', timeBucket: 'day' }, ... }
// projectViewPrefs: getInitialViewPrefs(LS_VIEW_PREFS_SETTING),

interface IInitialState {
    analytics: any
    analyticsPerf: any
    captchaAnalytics: any
    captchaProjectsViewPrefs: any
    projectViewPrefs: any
}

const initialState: IInitialState = {
  analytics: {},
  analyticsPerf: {},
  captchaAnalytics: {},
  captchaProjectsViewPrefs: getInitialViewPrefs(LS_CAPTCHA_VIEW_PREFS_SETTING),
  projectViewPrefs: getInitialViewPrefs(LS_VIEW_PREFS_SETTING),
}

const cacheSlice = createSlice({
  name: 'cache',
  initialState,
  reducers: {
    setProjectCache(state, { payload }: PayloadAction<{ pid: string, key: string, data: any }>) {
      state.analytics[payload.pid][payload.key] = payload.data
    },
    setCaptchaProjectCache(state, { payload }: PayloadAction<{ pid: string, key: string, data: any }>) {
      state.captchaAnalytics[payload.pid][payload.key] = payload.data
    },
    deleteProjectCache(state, { payload }: PayloadAction<{ pid?: string, period?: string, timeBucket?: string }>) {
      const { pid, period, timeBucket } = payload
      let key: string

      if (period && timeBucket) {
        key = getProjectCacheKey(period, timeBucket)
      }

      if (_isEmpty(period) || _isEmpty(timeBucket)) {
        if (_isEmpty(pid)) {
          state.analytics = {}
        }
        state.analytics = _filter(state.analytics, (project) => project !== pid)
      }
      if (pid) {
        state.analytics[pid] = _filter(state.analytics[pid], (ckey) => ckey !== key)
      }
    },
    deleteCaptchaProjectCache(state, { payload }: PayloadAction<{ pid: string, period?: string, timeBucket?: string }>) {
      const { pid, period, timeBucket } = payload
      let key: string

      if (period && timeBucket) {
        key = getProjectCaptchaCacheKey(period, timeBucket)
      }

      if (_isEmpty(period) || _isEmpty(timeBucket)) {
        if (_isEmpty(pid)) {
          state.captchaAnalytics = {}
        }
        state.captchaAnalytics = _filter(state.captchaAnalytics, (project) => project !== pid)
      }
      state.captchaAnalytics[pid] = _filter(state.captchaAnalytics[pid], (ckey) => ckey !== key)
    },
    setProjectViewPrefs(state, { payload }: PayloadAction<{ pid: string, period: string, timeBucket: string, rangeDate?: Date[] }>) {
      const {
        pid, period, timeBucket, rangeDate,
      } = payload
      const viewPrefs = rangeDate ? {
        period, timeBucket, rangeDate,
      } : {
        period, timeBucket,
      }
      window.localStorage.setItem(LS_VIEW_PREFS_SETTING, JSON.stringify(viewPrefs))
      state.projectViewPrefs[pid] = viewPrefs
    },
    setCaptchaProjectViewPrefs(state, { payload }: PayloadAction<{ pid: string, period: string, timeBucket: string, rangeDate?: Date[] | null }>) {
      const {
        pid, period, timeBucket, rangeDate,
      } = payload
      const viewPrefs = rangeDate ? {
        period, timeBucket, rangeDate,
      } : {
        period, timeBucket,
      }
      window.localStorage.setItem(LS_CAPTCHA_VIEW_PREFS_SETTING, JSON.stringify(viewPrefs))
      state.captchaProjectsViewPrefs[pid] = viewPrefs
    },
    setProjectCachePerf(state, { payload }: PayloadAction<{ pid: string, key: string, data: any }>) {
      state.analyticsPerf[payload.pid][payload.key] = payload.data
    },
    deleteProjectCachePerf(state, { payload }: PayloadAction<{ pid: string, period: string, timeBucket: string }>) {
      const { pid, period, timeBucket } = payload
      const key = getProjectCacheKey(period, timeBucket)

      if (_isEmpty(period) || _isEmpty(timeBucket)) {
        if (_isEmpty(pid)) {
          state.analyticsPerf = {}
        }
        state.analyticsPerf = _filter(state.analyticsPerf, (project) => project !== pid)
      }
      state.analyticsPerf[pid] = _filter(state.analyticsPerf[pid], (ckey) => ckey !== key)
    },
    setProjectForecastCache(state, { payload }: PayloadAction<{ pid: string, key: string, data: any }>) {
      state.analytics[payload.pid][payload.key] = payload.data
    },
  },
})

export const cacheActions = cacheSlice.actions

export default cacheSlice.reducer
