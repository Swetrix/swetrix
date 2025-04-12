import { combineReducers, configureStore } from '@reduxjs/toolkit'
import { useDispatch } from 'react-redux'

import { isDevelopment } from '~/lib/constants'

import authSlice from '../reducers/auth'

const rootReducer = combineReducers({
  auth: authSlice,
})

export const store = configureStore({
  reducer: rootReducer,
  devTools: isDevelopment,
})

export type AppDispatch = typeof store.dispatch
export const useAppDispatch: () => AppDispatch = useDispatch
export type StateType = ReturnType<typeof store.getState>
