import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { getItem, removeItem, setItem } from '~/utils/localstorage'
import { LS_VIEW_PREFS_SETTING, LS_CAPTCHA_VIEW_PREFS_SETTING, isBrowser } from '~/lib/constants'
import { filterInvalidViewPrefs } from '~/pages/Project/View/utils/filters'

const getInitialViewPrefs = (LS_VIEW: string) => {
  if (!isBrowser) {
    return {}
  }

  const storedPrefs = getItem(LS_VIEW)

  try {
    return filterInvalidViewPrefs(storedPrefs)
  } catch {
    removeItem(LS_VIEW)
  }

  return {}
}

interface InitialState {
  captchaProjectsViewPrefs: any
  customEventsPrefs: any
  projectViewPrefs: {
    [key: string]: {
      period: string
      timeBucket: string
      rangeDate?: Date[]
    }
  } | null
}

const initialState: InitialState = {
  captchaProjectsViewPrefs: getInitialViewPrefs(LS_CAPTCHA_VIEW_PREFS_SETTING) || {},
  projectViewPrefs: getInitialViewPrefs(LS_VIEW_PREFS_SETTING),
  customEventsPrefs: {},
}

const cacheSlice = createSlice({
  name: 'cache',
  initialState,
  reducers: {
    setProjectViewPrefs(
      state,
      { payload }: PayloadAction<{ pid: string; period: string; timeBucket: string; rangeDate?: Date[] }>,
    ) {
      const { pid, period, timeBucket, rangeDate } = payload
      const viewPrefs = rangeDate
        ? {
            period,
            timeBucket,
            rangeDate,
          }
        : {
            period,
            timeBucket,
          }
      const storedPrefs = getItem(LS_VIEW_PREFS_SETTING) as {
        [key: string]: {
          period: string
          timeBucket: string
          rangeDate?: Date[]
        }
      }
      if (typeof storedPrefs === 'object' && storedPrefs !== null) {
        storedPrefs[pid] = viewPrefs
        setItem(LS_VIEW_PREFS_SETTING, JSON.stringify(storedPrefs))
      } else {
        setItem(LS_VIEW_PREFS_SETTING, JSON.stringify({ [pid]: viewPrefs }))
      }
      state.projectViewPrefs = {
        ...state.projectViewPrefs,
        [pid]: viewPrefs,
      }
    },
    setCaptchaProjectViewPrefs(
      state,
      { payload }: PayloadAction<{ pid: string; period: string; timeBucket: string; rangeDate?: Date[] | null }>,
    ) {
      const { pid, period, timeBucket, rangeDate } = payload
      const viewPrefs = rangeDate
        ? {
            period,
            timeBucket,
            rangeDate,
          }
        : {
            period,
            timeBucket,
          }
      const storedPrefs = getItem(LS_CAPTCHA_VIEW_PREFS_SETTING) as {
        [key: string]: {
          period: string
          timeBucket: string
          rangeDate?: Date[]
        }
      }
      if (typeof storedPrefs === 'object' && storedPrefs !== null) {
        storedPrefs[pid] = viewPrefs
        setItem(LS_CAPTCHA_VIEW_PREFS_SETTING, JSON.stringify(storedPrefs))
      } else {
        setItem(LS_CAPTCHA_VIEW_PREFS_SETTING, JSON.stringify({ [pid]: viewPrefs }))
      }
      state.captchaProjectsViewPrefs = {
        ...state.captchaProjectsViewPrefs,
        [pid]: viewPrefs,
      }
    },
    setCustomEventsPrefs(state, { payload }: PayloadAction<{ pid: string; data: any }>) {
      state.customEventsPrefs = {
        ...state.customEventsPrefs,
        [payload.pid]: {
          ...state.customEventsPrefs[payload.pid],
          ...payload.data,
        },
      }
    },
  },
})

export const cacheActions = cacheSlice.actions

export default cacheSlice.reducer
