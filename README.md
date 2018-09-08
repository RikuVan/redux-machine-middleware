# `REDUX MACHINE MIDDLEWARE`

[![Coverage Status](https://coveralls.io/repos/github/RikuVan/redux-machine-middleware/badge.svg?branch=master)](https://coveralls.io/github/RikuVan/redux-machine-middleware?branch=master)

### Beware, this is new and not tested in apps

## TODO

- [ ] eslint
- [ ] > 90% test coverage
- [ ] add additional complex example
- [x] build (rollup?)

### Quick start

```js
import {
  createMachineMiddleware
  machinesReducer,
  transitionTo
} from 'redux-machine-middleware'

const counterMachine = {/* see example below */}

const machineMiddleware = createMachineMiddleware(
  // add as many machines as you like
  { counter: couterMachine },
  // use strict mode when developing
  { strict: true }
)

applyMiddleware(/* other middleware */ machineMiddleware)

const rootReducer = combineReducers({
  // this must be named machines
  machines: machinesReducer,
  gallery: galleryReducer
})

// initialize your reducer with your initial state
store.dispatch(transitionTo('counter', 'INITITAL_STATE'))
```

### API

### Middleware

`createMachineMiddleware:: (machines: Machines, options: {strict: boolean}) -> store -> next -> action`

### Actions

`transitionTo :: (machineName: string, stateName: string) -> {type: '@@TRANSITION_STATE', machineName, stateName}`

Transitions can either occur automatically via an autoTransition or by using the `transitionTo` action creator.

### Machine reducer

- must be named `machines`
- only updates on one action type: TRANSITION_MACHINE
- listen for this same action in other reducers if you like

### Validation

In strict mode, errors will be thrown for:

- missing machine
- `transitionTo` called with invalid next state
- invalid transition object properties
- invalid transition object value types
- cond function which does not return a truthy or falsey value

#### State machine config

```js
const machines = {
  fooMachine: {
    current: 'IDLE',
    // option to pass only a slice of redux store to cond functions
    selector: ['foo'],
    states: [
      {
        name: 'RUNNING',
        autoTransitions: [
          {
            // cond takes state and the current action and returns a boolean
            // if cond passes, to value for the this transition will be dispatched with transitionTo
            cond: (foo, action) => {
              action.payload + foo.number > 10
            }
            to: 'IDLE'
            // if this state is dispatching the following actions will be dispatched before and after
            // ONLY for this particular autoTransition
            before: ({getState, dispatch, action}) => launchMissle(),
            after: ({getState, dispatch, action}) => cleanUpTheMess()
          }
        ],
        // in strict mode an error will be thrown if the next state for this state is in this list
        validTransitions: ['IDLE']
      },
      {
        name: 'IDLE',
        autoTransitions: [
          {
            cond: foo => foo.number === 2,
            to: 'RUNNING'
          }
        ],
        // if IDLE transitions with transtionTo, this hook will be called
        after: ({getState, dispatch, action}) => announceShutdown(action)
      }
    ]
  }
}
```