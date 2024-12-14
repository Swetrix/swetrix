import { combineReducers, configureStore } from '@reduxjs/toolkit'
import { useDispatch } from 'react-redux'
import { isDevelopment } from '~/lib/constants'
import authSlice from '../reducers/auth'
import miscSlice from '../reducers/ui/misc'
import themeSlice from '../reducers/ui/theme'
import cacheSlice from '../reducers/ui/cache'

const rootReducer = combineReducers({
  auth: authSlice,
  ui: combineReducers({
    misc: miscSlice,
    theme: themeSlice,
    cache: cacheSlice,
  }),
})

export const store = configureStore({
  reducer: rootReducer,
  devTools: isDevelopment,
})

export type AppDispatch = typeof store.dispatch
export const useAppDispatch: () => AppDispatch = useDispatch
export type StateType = ReturnType<typeof store.getState>
