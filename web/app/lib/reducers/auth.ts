import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { User } from '../models/User'
import { FREE_TIER_KEY, isSelfhosted } from '../constants'

interface AuthState {
  user: User
  authenticated: boolean
  loading: boolean
  dontRemember: boolean
  isPaidTierUsed: boolean
}

const initialState: AuthState = {
  user: {} as User,
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
    authSuccessful: (state, { payload }: PayloadAction<User>) => {
      state.user = payload
      state.authenticated = true
      state.isPaidTierUsed = isSelfhosted || ((payload?.planCode && payload.planCode !== FREE_TIER_KEY) as boolean)
    },
    logout: (state) => {
      state.user = {} as User
      state.authenticated = false
      state.isPaidTierUsed = isSelfhosted
    },
    setDontRemember: (state, { payload }: PayloadAction<boolean>) => {
      state.dontRemember = payload
    },
    mergeUser: (state, { payload }: PayloadAction<Partial<User>>) => {
      state.user = { ...state.user, ...payload }
    },
    setUser: (state, { payload }: PayloadAction<User>) => {
      state.user = payload
    },
  },
})

export const authActions = authSlice.actions

export default authSlice.reducer
