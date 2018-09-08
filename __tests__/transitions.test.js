import {
  createMachineMiddleware as middleware,
  TRANSITION_MACHINE,
  transitionTo
} from '../source/'
import configureStore from 'redux-mock-store'
import * as R from 'ramda'

const createStore = configureStore([middleware])

const initialMachines = {
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
            cond: (_, { baz }) => baz > 5,
            to: 'STATE_2'
          }
        ],
        validTransitions: ['STATE_1', 'STATE_2']
      },
      {
        name: 'STATE_1',
        autoTransitions: [
          {
            cond: (_, { baz }) => baz === 0,
            to: 'STATE_2'
          }
        ],
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
            after: () => ({ type: 'AFTER' }),
            before: () => ({ type: 'BEFORE' }),
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
  machines: { foo: {} }
}

const setUpForTest = (machines, initialState) => {
  const store = createStore(initialState || state)
  const doDispatch = jest.fn(store.dispatch)
  const doGetState = jest.fn(store.getState)
  const doNext = jest.fn()
  const nextHandler = middleware(machines || initialMachines, { strict: true })(
    {
      dispatch: doDispatch,
      getState: doGetState
    }
  )
  const actionHandler = nextHandler(doNext)
  return { store, doDispatch, nextHandler, actionHandler }
}

test('should transition based on store state passed to cond', () => {
  const { actionHandler, doDispatch } = setUpForTest()
  actionHandler({ type: 'BAZ_ACTION' })
  expect(doDispatch).toBeCalledWith({
    type: TRANSITION_MACHINE,
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
  const { doDispatch, actionHandler } = setUpForTest(machines)
  actionHandler({ type: 'BAZ_ACTION', baz: 11 })
  expect(doDispatch).toBeCalledWith({
    type: TRANSITION_MACHINE,
    machineName: 'foo',
    stateName: 'STATE_2'
  })
})

test('transition should not be triggered when no cond passes', () => {
  const s = R.set(R.lensPath(['baz']), -1, state)
  const { actionHandler, doDispatch } = setUpForTest(initialMachines, s)
  actionHandler({ type: 'BAZ_ACTION' })
  expect(doDispatch).not.toBeCalled()
})

test('cond which does not return a value should throw an error in strict mode', () => {
  const m = R.set(
    R.lensPath(['foo', 'states', 2, 'autoTransitions', 0, 'cond']),
    function() {},
    initialMachines
  )
  const { actionHandler } = setUpForTest(m)
  expect(() => actionHandler({ type: 'BAZ_ACTION' })).toThrow(
    /Ensure your cond function returns a truthy or falsey value/
  )
})

test('invalid stateName in transitionTo should throw an error in strict mode', () => {
  const { actionHandler } = setUpForTest()
  expect(() => actionHandler(transitionTo('foo', 'STATE_3'))).toThrow(
    /'STATE_3' is not listed in valid transitions for state STATE_2/
  )
})

test('invalid property should throw an error in strict mode', () => {
  const m = R.set(
    R.lensPath(['foo', 'states', 0, 'autoTransitions', 0, 'condition']),
    v => v,
    initialMachines
  )
  const { actionHandler } = setUpForTest(m)
  expect(() =>
    actionHandler(actionHandler({ type: 'BAZ_ACTION' })).toThrow(
      /'condition' is not a valid property for transition configuration/
    )
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
  const { actionHandler, doDispatch } = setUpForTest(m, {
    baz: 47,
    machines: { foo: {} }
  })
  actionHandler({ type: 'BAZ_ACTION' })
  expect(doDispatch).toBeCalledWith({
    type: TRANSITION_MACHINE,
    machineName: 'foo',
    stateName: 'STATE_1'
  })
})

test('throws error if machine is missing in strict mode', () => {
  const { actionHandler } = setUpForTest()
  expect(() => actionHandler(transitionTo('foo2', 'STATE_1'))).toThrow(
    /no state machine exist for name foo2, current machines include foo/
  )
})

test('before and after actions will be dispatched if the exist on transition', () => {
  const { actionHandler, doDispatch } = setUpForTest(initialMachines, {
    baz: 100,
    machines: {}
  })
  actionHandler({ type: 'BAZ_ACTION' })
  expect(doDispatch).toHaveBeenNthCalledWith(1, { type: 'BEFORE' })
  expect(doDispatch).toHaveBeenNthCalledWith(3, { type: 'AFTER' })
})
