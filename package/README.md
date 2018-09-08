# `REDUX MACHINE MIDDLEWARE`

[![Coverage Status](https://coveralls.io/repos/github/RikuVan/redux-machine-middleware/badge.svg?branch=master)](https://coveralls.io/github/RikuVan/redux-machine-middleware?branch=master)

### WARNING

This is still under development and not ready for more than testing yet

## TODO

- [ ] add pre/post transition hooks
- [ ] 100% test coverage
- [ ] add sufficiently complex example of usage
- [x] build (rollup?)

### API

#### Actions

`intializeMachines :: machineStates -> {type: '@@INIT_MACHINES', machineStates}`

See the machines configuration below for an example of the machineStates configuration.

`transitionTo :: (machineName: string, stateName: string) -> {type: '@@TRANSITION_STATE', machineName, stateName}`

Transitions can either occur automatically via an autoTransition or by using the `transitionTo` action creator.

### Validation

Errors will be thrown in a transition action is called with an invalid state name or if the state name is not contained in the validTransitions array for the state being transitioned away from

#### State machine config

```js
const machines = {
  fooMachine: {
    current: 'IDLE',
    // option to pass slice of redux store to cond functions
    condStatePath: ['foo'],
    states: [
      {
        name: 'RUNNING',
        autoTransitions: [
          {
            // if cond is truthy, to will be dispatched with transitionTo with 'NONE'
            cond: foo => foo.list.length > 6,
            to: 'IDLE'
          }
        ],
        validTransitions: ['IDLE']
      },
      {
        name: 'IDLE',
        autoTransitions: [
          {
            cond: foo => foo.list.length > 2,
            to: 'RUNNING'
          }
        ],
        validTransitions: ['RUNNING']
      }
    ]
  }
}
```
