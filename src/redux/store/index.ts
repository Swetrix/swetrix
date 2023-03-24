import { combineReducers, configureStore } from '@reduxjs/toolkit'
import createSagaMiddleware from 'redux-saga'
import rootSaga from '../sagas'
import authSlice from '../reducers/auth'

const rootReducer = combineReducers({
  auth: authSlice,
})

const sagaMiddleware = createSagaMiddleware()

export const setupStore = () => {
  return configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware: any) => getDefaultMiddleware()
      .concat(sagaMiddleware),
  })
}

export type RootState = ReturnType<typeof rootReducer>
export type AppStore = ReturnType<typeof setupStore>
export type AppDispatch = AppStore['dispatch']

sagaMiddleware.run(rootSaga)
