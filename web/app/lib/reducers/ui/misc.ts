import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { LOW_EVENTS_WARNING, LS_PROJECTS_PROTECTED } from '~/lib/constants'
import { setCookie } from '~/utils/cookie'
import { secondsTillNextMonth } from '~/utils/generic'
import { Stats } from '~/lib/models/Stats'
import { Metainfo } from '~/lib/models/Metainfo'
import { getItem, setItem } from '~/utils/localstorage'

interface InitialState {
  stats: Stats
  metainfo: Metainfo
  paddleLoaded: boolean
  paddle: any
  showNoEventsLeftBanner: boolean
  lastBlogPost: any
  extensions: any[]
  projectPasswords: {
    [key: string]: string
  }
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
  projectPasswords: getItem(LS_PROJECTS_PROTECTED) || {},
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
    setProjectPassword: (state, { payload }: PayloadAction<{ id: string; password: string }>) => {
      const { id, password } = payload

      state.projectPasswords = {
        ...state.projectPasswords,
        [id]: password,
      }
      setItem(LS_PROJECTS_PROTECTED, JSON.stringify(state.projectPasswords))
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
