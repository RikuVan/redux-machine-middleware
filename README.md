# `REDUX MACHINE MIDDLEWARE`

[![Coverage Status](https://coveralls.io/repos/github/RikuVan/redux-machine-middleware/badge.svg)](https://coveralls.io/github/RikuVan/redux-machine-middleware)

### Beware, this is new and not tested in apps

## TODO

- [ ] eslint
- [ ] > 90% test coverage
- [ ] add additional complex example
- [x] build (rollup?)

### Quick start

```js
npm install redux-machine-middleware
```

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

### Why

There are much better explanations of finite state machines out there than what I can provide and a state machine is probably overkill for small functionality. But here is why I am interested. As features grow, if you only think of your UI in terms of boolean flags and conditionals, you will quickly be fighting bugs. Using Redux alone doesn't prevent this. Moduling your UI as a union type may help. But we still lack the ability to hook into the transitions from state to state--the variants grow out of control. Modeling your UI as a finite state machine seems a promising way to bring discipline to your code base when there are many variants--each state and transition is accounted for by the machine. This has the added benefit of forcing your to document states.

### Examples

I have ported David Khourshid's example app for xstate (an excellent full-featured finite state machine lib). The code is under `/example`. Here is the [live version](http://redux-machine-middleware-ex.surge.sh/) and [the original](https://codepen.io/davidkpiano/pen/dJJMWE). I plan to do a questionnaire with tabs of new questions dependent on your last answers.

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
- invalid transition object properties (prefix special properties with underscore or dollar sign and they will be ignored)
- invalid transition object value types
- cond function which does not return a truthy or falsey value

#### State machine config

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
        // if 'IDLE' transitions via a transtionTo action, this hook will be called
        after: ({getState, dispatch, action}) => announceShutdown(action)
      },
      validTransitions: ['RUNNING']
    ]
  }
}
```
