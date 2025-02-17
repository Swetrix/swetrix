import { createSlice, PayloadAction } from '@reduxjs/toolkit'

import { User } from '../models/User'

interface AuthState {
  user: User
  authenticated: boolean
  loading: boolean
  dontRemember: boolean
}

const initialState: AuthState = {
  user: {} as User,
  authenticated: false,
  loading: true,
  dontRemember: false,
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
    },
    logout: (state) => {
      state.user = {} as User
      state.authenticated = false
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
