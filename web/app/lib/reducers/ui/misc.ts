import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { LOW_EVENTS_WARNING } from 'redux/constants'
import { setCookie } from 'utils/cookie'
import { secondsTillNextMonth } from 'utils/generic'
import { Stats } from 'redux/models/Stats'
import { Metainfo } from 'redux/models/Metainfo'

interface InitialState {
  stats: Stats
  metainfo: Metainfo
  paddleLoaded: boolean
  paddle: any
  showNoEventsLeftBanner: boolean
  lastBlogPost: any
  extensions: any[]
}

const initialState: InitialState = {
  stats: {
    users: 0,
    projects: 0,
    events: 0,
  },
  metainfo: {
    country: null,
    region: null,
    city: null,
    symbol: '$',
    code: 'USD',
  },
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
    setGeneralStats(state, { payload }: PayloadAction<Stats>) {
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
    setMetainfo(state, { payload }: PayloadAction<Metainfo>) {
      state.metainfo = payload
    },
    setLastBlogPost(state, { payload }: PayloadAction<any>) {
      state.lastBlogPost = payload
    },
  },
})

export const miscActions = miscSlice.actions

export default miscSlice.reducer
