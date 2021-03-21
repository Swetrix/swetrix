import { createStore, applyMiddleware, compose } from 'redux'
import createSagaMiddleware from 'redux-saga'
import root_reducer from 'reducers'
// import root_saga from 'sagas'

// const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose
// const sagaMiddleware = createSagaMiddleware()

export const store = createStore(
	root_reducer,
	// composeEnhancers(applyMiddleware(sagaMiddleware))
)

// sagaMiddleware.run(root_saga)