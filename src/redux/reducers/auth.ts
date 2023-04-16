/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable no-unused-expressions */
/* eslint-disable no-param-reassign */
import { createSlice, current, PayloadAction } from '@reduxjs/toolkit'
import _filter from 'lodash/filter'
import _map from 'lodash/map'
import { IUser } from '../models/IUser'
import { FREE_TIER_KEY, isSelfhosted } from '../constants'
import { ISharedProject } from '../models/ISharedProject'

interface IAuthState {
  user: IUser
  redirectPath: string | null
  authenticated: boolean
  loading: boolean
  dontRemember: boolean
  isPaidTierUsed: boolean
}

const initialState: IAuthState = {
  user: {} as IUser,
  redirectPath: null,
  authenticated: false,
  loading: true,
  dontRemember: false,
  // if the app is selfhosted, we assume that the user is using a paid tier so there won't be any restrictions or advertising of it
  isPaidTierUsed: isSelfhosted,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    finishLoading: (state) => {
      state.loading = false
    },
    loginSuccessful: (state, { payload }: PayloadAction<IUser>) => {
      state.user = payload
      state.authenticated = true
      state.isPaidTierUsed = isSelfhosted || (payload?.planCode && payload.planCode !== FREE_TIER_KEY) as boolean
    },
    emailVerifySuccessful: (state) => {
      state.user = { ...state.user, isActive: true }
    },
    signupUpSuccessful: (state, { payload }: PayloadAction<IUser>) => {
      state.user = payload
      state.authenticated = true
      state.isPaidTierUsed = isSelfhosted || (payload?.planCode && payload.planCode !== FREE_TIER_KEY) as boolean
    },
    updateUserProfileSuccess: (state, { payload }: PayloadAction<IUser>) => {
      state.user = payload
    },
    logout: (state) => {
      state.user = {} as IUser
      state.authenticated = false
      state.isPaidTierUsed = isSelfhosted
    },
    savePath: (state, { payload }: PayloadAction<string>) => {
      state.redirectPath = payload
    },
    deleteAccountSuccess: (state) => {
      state.user = {} as IUser
      state.authenticated = false
      state.isPaidTierUsed = isSelfhosted
    },
    deleteShareProject: (state, { payload }: PayloadAction<string>) => {
      const projects = _filter(state.user?.sharedProjects, (item) => item.id !== payload)
      state.user = { ...state.user, sharedProjects: projects }
    },
    setUserShareData: (state, { payload }: PayloadAction<{ data: Partial<ISharedProject>, id: string }>) => {
      const projects = _map(current(state.user?.sharedProjects), (item) => {
        if (item.id === payload.id) {
          return { ...item, ...payload.data }
        }
        return item
      })
      state.user = { ...state.user, sharedProjects: projects }
    },
    setDontRemember: (state, { payload }: PayloadAction<boolean>) => {
      state.dontRemember = payload
    },
    updateUserData: (state, { payload }: PayloadAction<IUser>) => {
      state.user = { ...state.user, ...payload }
    },
    setApiKey: (state, { payload }: PayloadAction<string>) => {
      state.user = { ...state.user, apiKey: payload }
    },
    setUser: (state, { payload }: PayloadAction<IUser>) => {
      state.user = { ...state.user, ...payload }
    },
  },
})

export const authActions = authSlice.actions

export default authSlice.reducer
