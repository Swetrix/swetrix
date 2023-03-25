import { combineReducers, configureStore } from '@reduxjs/toolkit'
import createSagaMiddleware from 'redux-saga'
import rootSaga from '../sagas'
import authSlice from '../reducers/auth'
import errorsSlice from '../reducers/errors'
import alertsSlice from '../reducers/alerts'
import miscSlice from '../reducers/ui/misc'
import projectsSlice from '../reducers/ui/projects'
import alertsProjectsSlice from '../reducers/ui/alerts'
import themeSlice from '../reducers/ui/theme'
import cacheSlice from '../reducers/ui/cache'

const rootReducer = combineReducers({
  auth: authSlice,
  errors: errorsSlice,
  alerts: alertsSlice,
  ui: combineReducers({
    misc: miscSlice,
    projects: projectsSlice,
    alerts: alertsProjectsSlice,
    theme: themeSlice,
    cache: cacheSlice,
  }),
})

const sagaMiddleware = createSagaMiddleware()

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware: any) => getDefaultMiddleware()
    .concat(sagaMiddleware),
})

sagaMiddleware.run(rootSaga)

export type RootState = ReturnType<typeof rootReducer>
export type AppStore = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
