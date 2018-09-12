# `redux-machine-middleware`

[![Coverage Status](https://coveralls.io/repos/github/RikuVan/redux-machine-middleware/badge.svg?branch=master)](https://coveralls.io/github/RikuVan/redux-machine-middleware?branch=master)

### Quick start

```js
npm install redux-machine-middleware
```

#### Option A

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
  counter: counterReducer
})

// initialize your reducer with your initial state
store.dispatch(transitionTo('counter', 'INITITAL_STATE'))
```

#### Option B

```js
import {
  createMachineMiddleware,
  decorateReducerWithMachine,
  transitionTo
} from 'redux-machine-middleware'

const counterMachine = {
  /* see example below */
}

const machineMiddleware = createMachineMiddleware({}, {strict: true})

applyMiddleware(/* other middleware */ machineMiddleware)

const machineDecorator = decorateReducerWithMachine('counter', counterMachine)
const counterReducer = (state, action) => {
  if (action.type === INC) {
    return {...state, number: state.number + 1}
  }
  return state
}

const rootReducer = combineReducers({
  // give your reducer and initialState to the decorator
  counter: machineDecorator(counterReducer, {number: 0}),
  ...otherReducers
})

// initialize your reducer with your initial state
store.dispatch(transitionTo('counter', 'INITITAL_STATE'))
```

### Why

Read here to learn a bit about [finite state machines](https://www.smashingmagazine.com/2018/01/rise-state-machines/). As your features grow in complexity, if you only think of your UI in terms of boolean flags and conditionals to order to transition from state to state, the complexity in your views will escalate. Using Redux alone doesn't prevent this. The idea here is to let your store do what its does best--hold your data and update when actions are dispatched, while your machine middleware controls your state transitions, ideally eliminating the need to fill your view with logic that does not really document your intention.

### Examples

I have ported David Khourshid's example app for xstate (an excellent full-featured finite state machine lib). The code is under `/example`. Here is the [live version](http://redux-machine-middleware-ex.surge.sh/) and [the original](https://codepen.io/davidkpiano/pen/dJJMWE). I plan to do a questionnaire with tabs of new questions dependent on your last answers.

### API

### Middleware

`createMachineMiddleware:: (machines: Machines, options: {strict: boolean}) -> store -> next -> action`

### Actions

`transitionTo :: (machineName: string, stateName: string) -> {type: '@@TRANSITION_STATE', machineName, stateName}`

Transitions can either occur automatically via an autoTransition or by using the `transitionTo` action creator.

### Machine reducer

#### OPTION A - single `machineReducer`

`machineReducer :: (state: {}, action: {type: string}) -> state`

- must be named `machines`
- only updates on one action type: TRANSITION_MACHINE_STATE
- listen for this same action in other reducers if you like

#### OPTION B - decorate your reducers with machine using

`decorateReducerWithMachine :: (machineName: string, machine: Machine) -> (reducer: function, initialState: {}) -> (state: {}, action: {type: string}) -> state`

- the state of your reducer will be merged with the state of the named machine
- machine identifier is a symbol to avoid conflicting with your properties

In theory you could mix options A & B, although this is not yet tested and would probably lead to confusing code.

### Validation

In strict mode, errors will be thrown for:

- missing machine
- `transitionTo` called with invalid next state
- invalid transition object properties (prefix special properties with underscore or dollar sign and they will be ignored)
- invalid transition object value types
- cond function which does not return a truthy or falsey value

### State machine config

```js
const machines = {
  foo: {
    // it is recommend your initialize the machine reducer with this value when loading the component/app
    default: 'IDLE',
    // option to pass only a slice of redux store to cond functions
    selector: ['foo'],
    states: [
      {
        name: 'RUNNING',
        autoTransitions: [
          {
            // cond takes state and the current action and returns a boolean
            // if cond passes, the `to` value (next state) for the this transition will be dispatched with transitionTo
            cond: (foo, action) => action.payload + foo.number > 10
            to: 'IDLE'
            // if this state is dispatching the following actions will be dispatched before and after
            // ONLY for this particular autoTransition if nested in the autoTransition
            // in this case hooks outside of the autoTransition will not be called
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
        // if 'IDLE' is the next state called with transtionTo, 'before' or 'after' hooks will be called
        // It is IMPORTANT to notice that this is different logic that for autoTransitions
        // the hooks there happen round the departing state and here around the arriving state
        after: ({getState, dispatch, action}) => announceShutdown(action)
      },
      validTransitions: ['RUNNING']
    ]
  }
}
```

### Selectors

#### Option A

`getMachineState :: (name: string) -> (state: StoreState) -> string`

Use this one if you use the single default reducer with the name `machines`.

The first string parameter is the name give to the machine.

#### Option B

`getMachineStateFromDecorated :: (name: string) -> (state: StoreState) -> string`

Use this one if you use the decorate your own reducer with `decorateReducerWithMachine`.

The first string parameter is the name given to the reducer.
