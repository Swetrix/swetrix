import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { LOW_EVENTS_WARNING } from 'redux/constants'
import { setCookie } from 'utils/cookie'
import { secondsTillNextMonth } from 'utils/generic'
import { IStats } from 'redux/models/IStats'
import { IMetainfo } from 'redux/models/IMetainfo'
import { IUsageInfo } from 'redux/models/IUsageinfo'

interface IInitialState {
  stats: IStats
  metainfo: IMetainfo
  usageinfo: IUsageInfo
  usageinfoLoaded: boolean
  paddleLoaded: boolean
  paddle: any
  showNoEventsLeftBanner: boolean
  lastBlogPost: any
  extensions: any[]
}

const initialState: IInitialState = {
  stats: {
    users: 0,
    projects: 0,
    events: 0,
  },
  metainfo: {
    country: null,
    symbol: '$',
    code: 'USD',
  },
  usageinfo: {
    total: 0,
    traffic: 0,
    errors: 0,
    customEvents: 0,
    captcha: 0,
    trafficPerc: 0,
    errorsPerc: 0,
    customEventsPerc: 0,
    captchaPerc: 0,
  },
  usageinfoLoaded: false,
  paddleLoaded: false,
  paddle: {},
  showNoEventsLeftBanner: false,
  lastBlogPost: null,
  extensions: [],
}

const miscSlice = createSlice({
  name: 'misc',
  initialState,
  reducers: {
    setGeneralStats(state, { payload }: PayloadAction<IStats>) {
      state.stats = payload
    },
    setPaddleLastEvent(state, { payload }: PayloadAction<any>) {
      state.paddle = { ...state.paddle, lastEvent: payload }
    },
    setShowNoEventsLeftBanner(state, { payload }: PayloadAction<boolean>) {
      if (!payload) {
        const maxAge = secondsTillNextMonth() + 86400
        setCookie(LOW_EVENTS_WARNING, 1, maxAge)
      }

      state.showNoEventsLeftBanner = payload
    },
    setExtensions(state, { payload }: PayloadAction<any[]>) {
      state.extensions = payload
    },
    setMetainfo(state, { payload }: PayloadAction<IMetainfo>) {
      state.metainfo = payload
    },
    setUsageinfo(state, { payload }: PayloadAction<IUsageInfo>) {
      state.usageinfoLoaded = true
      state.usageinfo = payload
    },
    setLastBlogPost(state, { payload }: PayloadAction<any>) {
      state.lastBlogPost = payload
    },
  },
})

export const miscActions = miscSlice.actions

export default miscSlice.reducer
