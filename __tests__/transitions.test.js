import {
  createMachineMiddleware as middleware,
  TRANSITION_MACHINE_STATE,
  transitionTo,
  MACHINE_STATE
} from '../source/'
import configureStore from 'redux-mock-store'
import * as R from 'ramda'

const createStore = configureStore([middleware])

export const initialMachines = {
  foo: {
    default: 'STATE_2',
    selector: ['baz'],
    states: [
      {
        name: 'STATE_0',
        autoTransitions: [
          {
            cond: baz => baz > 2 && baz < 4,
            to: 'STATE_1'
          },
          {
            cond: (_, {baz}) => baz > 5,
            to: 'STATE_2'
          }
        ],
        validTransitions: ['STATE_1', 'STATE_2']
      },
      {
        name: 'STATE_1',
        autoTransitions: [
          {
            cond: (_, {baz}) => baz === 0,
            to: 'STATE_2'
          }
        ],
        before: () => ({type: 'BEFORE'}),
        after: () => ({type: 'AFTER'}),
        validTransitions: ['STATE_2']
      },
      {
        name: 'STATE_2',
        autoTransitions: [
          {
            cond: baz => baz > 10 && baz < 100,
            to: 'STATE_1'
          },
          {
            cond: baz => baz === 100,
            before: () => ({type: 'BEFORE'}),
            after: () => ({type: 'AFTER'}),
            to: 'STATE_O'
          }
        ],
        validTransitions: ['STATE_1', 'STATE_0']
      }
    ]
  }
}

const state = {
  baz: 11,
  machines: {foo: {}}
}

const setUpForTest = (machines, initialState) => {
  const store = createStore(initialState || state)
  const doDispatch = jest.fn(store.dispatch)
  const doGetState = jest.fn(store.getState)
  const doNext = jest.fn()
  const nextHandler = middleware(machines || initialMachines, {
    strict: true
  })({
    dispatch: doDispatch,
    getState: doGetState
  })
  const actionHandler = nextHandler(doNext)
  return {store, doDispatch, doGetState, doNext, nextHandler, actionHandler}
}

test('should transition based on store state passed to cond', () => {
  const {actionHandler, doDispatch} = setUpForTest()
  actionHandler({type: 'BAZ_ACTION'})
  expect(doDispatch).toBeCalledWith({
    type: TRANSITION_MACHINE_STATE,
    machineName: 'foo',
    stateName: 'STATE_1'
  })
})

test('should transition based on action payload passed to cond', () => {
  const machines = R.set(
    R.lensPath(['foo', 'default']),
    'STATE_0',
    initialMachines
  )
  const {doDispatch, actionHandler} = setUpForTest(machines)
  actionHandler({type: 'BAZ_ACTION', baz: 11})
  expect(doDispatch).toBeCalledWith({
    type: TRANSITION_MACHINE_STATE,
    machineName: 'foo',
    stateName: 'STATE_2'
  })
})

test('transition should not be triggered when no cond passes', () => {
  const s = R.set(R.lensPath(['baz']), -1, state)
  const {actionHandler, doDispatch} = setUpForTest(initialMachines, s)
  actionHandler({type: 'BAZ_ACTION'})
  expect(doDispatch).not.toBeCalled()
})

test('cond which does not return a value should throw an error in strict mode', () => {
  const m = R.set(
    R.lensPath(['foo', 'states', 2, 'autoTransitions', 0, 'cond']),
    function() {},
    initialMachines
  )
  const {actionHandler} = setUpForTest(m)
  expect(() => actionHandler({type: 'BAZ_ACTION'})).toThrow(
    /Ensure your cond function returns a truthy or falsey value/
  )
})

test('invalid stateName in transitionTo should throw an error in strict mode', () => {
  const {actionHandler} = setUpForTest()
  expect(() => actionHandler(transitionTo('foo', 'STATE_3'))).toThrow(
    /'STATE_3' is not listed in valid transitions for state STATE_2/
  )
})

test('cond will use whole store state if storePath not provided', () => {
  const m = R.compose(
    R.over(R.lensPath(['foo']), R.omit(['selector'])),
    R.set(
      R.lensPath(['foo', 'states', 2, 'autoTransitions', 0, 'cond']),
      store => store.baz === 47
    )
  )(initialMachines)
  const {actionHandler, doDispatch} = setUpForTest(m, {
    baz: 47,
    machines: {foo: {}}
  })
  actionHandler({type: 'BAZ_ACTION'})
  expect(doDispatch).toBeCalledWith({
    type: TRANSITION_MACHINE_STATE,
    machineName: 'foo',
    stateName: 'STATE_1'
  })
})

test('throws error if machine is missing in strict mode', () => {
  const {actionHandler} = setUpForTest()
  expect(() => actionHandler(transitionTo('foo2', 'STATE_1'))).toThrow(
    /no state machine exist for name foo2, current machines include foo/
  )
})

test('actions still ok without machine when not in strict mode', () => {
  const {doDispatch, doGetState, doNext} = setUpForTest()
  const nextHandler = middleware(undefined)({
    dispatch: doDispatch,
    getState: doGetState
  })
  const actionHandler = nextHandler(doNext)
  expect(() => actionHandler({type: 'BAZ'})).not.toThrow()
})

test('before and after actions will be dispatched if they exist on transition', () => {
  const {actionHandler, doDispatch} = setUpForTest(initialMachines, {
    baz: 100,
    machines: {}
  })
  actionHandler({type: 'BAZ_ACTION'})
  expect(doDispatch).toHaveBeenNthCalledWith(1, {type: 'BEFORE'})
  expect(doDispatch).toHaveBeenNthCalledWith(3, {type: 'AFTER'})
})

test('before and after actions will be dispatched if they exist on a state', () => {
  const {actionHandler, doDispatch} = setUpForTest(initialMachines, {
    baz: 10,
    machines: {foo: {current: 'STATE_0'}}
  })
  actionHandler(transitionTo('foo', 'STATE_1'))
  expect(doDispatch).toHaveBeenNthCalledWith(1, {type: 'BEFORE'})
  expect(doDispatch).toHaveBeenNthCalledWith(2, {type: 'AFTER'})
})

test('throws an error if transition contains an invalid property in strict mode', () => {
  const m = R.set(
    R.lensPath(['foo', 'states', 2, 'autoTransitions', 0]),
    {
      condition: baz => baz > 2 && baz < 4,
      to: 'STATE_0'
    },
    initialMachines
  )
  const {actionHandler} = setUpForTest(m, {
    baz: -1,
    machines: {foo: {}}
  })
  expect(() =>
    actionHandler({type: 'BAZ_ACTION', payload: 'hey'})
  ).toThrowError(
    `condition is not a valid property for autoTransition configuration`
  )
})

test('throws an error if "to" property is not a string in strict mode', () => {
  const m = R.set(
    R.lensPath(['foo', 'states', 2, 'autoTransitions', 0]),
    {
      cond: baz => baz > 2 && baz < 4,
      to: true
    },
    initialMachines
  )
  const {actionHandler} = setUpForTest(m, {
    baz: -1,
    machines: {foo: {}}
  })
  expect(() =>
    actionHandler({type: 'BAZ_ACTION', payload: 'hey'})
  ).toThrowError(/'true' is not of the correct type, it should be a string/)
})

test('throws an error if "cond" property is not a function in strict mode', () => {
  const m = R.set(
    R.lensPath(['foo', 'states', 2, 'autoTransitions', 0]),
    {
      cond: true,
      to: 'STATE_1'
    },
    initialMachines
  )
  const {actionHandler} = setUpForTest(m, {
    baz: -1,
    machines: {foo: {}}
  })
  expect(() =>
    actionHandler({type: 'BAZ_ACTION', payload: 'hey'})
  ).toThrowError(/'true' is not of the correct type, it should be a function/)
})

test('transition object may contain special property prefixed with _ or $ in strict mode', () => {
  const m = R.set(
    R.lensPath(['foo', 'states', 2, 'autoTransitions', 0]),
    {
      cond: baz => baz === 1000,
      _special: [0, 1],
      $data: 'extra',
      to: 'STATE_0'
    },
    initialMachines
  )
  const {actionHandler} = setUpForTest(m, {
    baz: -1,
    machines: {foo: {}}
  })
  expect(() =>
    actionHandler({type: 'BAZ_ACTION', payload: 'hey'})
  ).not.toThrowError()
})

describe('middleware with machines from reducers', () => {
  const machine = R.set(
    R.lensPath(['selector']),
    ['foo', 'baz'],
    initialMachines.foo
  )

  test('should transition based on store state passed to cond', () => {
    const initialState = {
      foo: {
        [MACHINE_STATE]: {
          name: 'foo',
          current: 'STATE_2',
          machine
        },
        baz: 11
      }
    }
    const {actionHandler, doDispatch} = setUpForTest({}, initialState)
    actionHandler({type: 'BAZ_ACTION'})
    expect(doDispatch).toBeCalledWith({
      type: TRANSITION_MACHINE_STATE,
      machineName: 'foo',
      stateName: 'STATE_1'
    })
  })

  test('should transition based on action payload passed to cond', () => {
    const m = R.set(R.lensPath(['default']), 'STATE_0', machine)
    const initialState = {
      foo: {
        [MACHINE_STATE]: {
          name: 'foo',
          current: 'STATE_0',
          machine: m
        },
        baz: 11
      }
    }
    const {actionHandler, doDispatch} = setUpForTest({}, initialState)
    actionHandler({type: 'BAZ_ACTION', baz: 11})
    expect(doDispatch).toBeCalledWith({
      type: TRANSITION_MACHINE_STATE,
      machineName: 'foo',
      stateName: 'STATE_2'
    })
  })

  test('should throw error if current state in store does not exist in strict mode', () => {
    const m = R.set(R.lensPath(['default']), 'STATE_0', machine)
    const initialState = {
      foo: {
        [MACHINE_STATE]: {
          name: 'foo',
          current: 'STATE_4',
          machine: m
        },
        baz: 11
      }
    }
    const {actionHandler, doDispatch} = setUpForTest({}, initialState)
    expect(() => actionHandler({type: 'BAZ_ACTION', baz: 11})).toThrowError(
      /Invalid transition to 'STATE_4'. Valid states are: STATE_0, STATE_1, STATE_2./
    )
  })
})
