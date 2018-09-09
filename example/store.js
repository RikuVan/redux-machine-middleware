import {createStore, applyMiddleware, combineReducers, compose} from 'redux'
import createSagaMiddleware from 'redux-saga'
import {all, fork} from 'redux-saga/effects'

import {gallerySaga, galleryReducer, galleryMachine} from './galleryState'
import {
  createMachineMiddleware,
  machinesReducer,
  transitionTo
} from 'redux-machine-middleware'

const machineMiddleware = createMachineMiddleware(
  {gallery: galleryMachine},
  {strict: true}
)

function* rootSaga() {
  yield all([fork(gallerySaga)])
}

const rootReducer = combineReducers({
  machines: machinesReducer,
  gallery: galleryReducer
})

const composeEnhancers =
  (process.env.NODE_ENV === 'development' &&
    window &&
    window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__) ||
  compose

function configureStore(initialState = {}) {
  const sagaMiddleware = createSagaMiddleware()
  return {
    ...createStore(
      rootReducer,
      initialState,
      composeEnhancers(applyMiddleware(sagaMiddleware, machineMiddleware))
    ),
    runSaga: sagaMiddleware.run
  }
}

export const store = configureStore()

store.runSaga(rootSaga)

store.dispatch(transitionTo('gallery', galleryMachine.default))
