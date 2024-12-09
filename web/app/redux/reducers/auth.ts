import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { IUser } from '../models/IUser'
import { FREE_TIER_KEY, isSelfhosted } from '../constants'

interface AuthState {
  user: IUser
  authenticated: boolean
  loading: boolean
  dontRemember: boolean
  isPaidTierUsed: boolean
}

const initialState: AuthState = {
  user: {} as IUser,
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
    authSuccessful: (state, { payload }: PayloadAction<IUser>) => {
      state.user = payload
      state.authenticated = true
      state.isPaidTierUsed = isSelfhosted || ((payload?.planCode && payload.planCode !== FREE_TIER_KEY) as boolean)
    },
    logout: (state) => {
      state.user = {} as IUser
      state.authenticated = false
      state.isPaidTierUsed = isSelfhosted
    },
    setDontRemember: (state, { payload }: PayloadAction<boolean>) => {
      state.dontRemember = payload
    },
    mergeUser: (state, { payload }: PayloadAction<Partial<IUser>>) => {
      state.user = { ...state.user, ...payload }
    },
    setUser: (state, { payload }: PayloadAction<IUser>) => {
      state.user = payload
    },
  },
})

export const authActions = authSlice.actions

export default authSlice.reducer
