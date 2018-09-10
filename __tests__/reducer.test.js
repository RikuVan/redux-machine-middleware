import {
  machinesReducer,
  TRANSITION_MACHINE_STATE,
  decorateReducerWithMachine,
  INITIALIZE_MACHINE
} from '../source'

test('machinesReducer will return state', () => {
  const state = machinesReducer({foo: 1}, {type: 'SOME_ACTION'})
  expect(state).toEqual(state)
})

test('machinesReducer will update state with current stateName', () => {
  const state = machinesReducer(
    {baz: 1},
    {type: TRANSITION_MACHINE_STATE, machineName: 'foo', stateName: 'STATE_1'}
  )
  expect(state).toEqual({
    baz: 1,
    foo: {current: 'STATE_1', last: undefined}
  })
})

test('machinesReducer will save the last state name', () => {
  const state = machinesReducer(
    {foo: {current: 'STATE_0'}},
    {type: TRANSITION_MACHINE_STATE, machineName: 'foo', stateName: 'STATE_1'}
  )
  expect(state).toEqual({
    foo: {current: 'STATE_1', last: 'STATE_0'}
  })
})

const basicReducer = (state = {value: 0}, action) => {
  if (action.type === 'TEST') {
    return {...state, value: action.value}
  }
  return state
}

const reducer = decorateReducerWithMachine('foo', {default: 'STATE_0'})(
  basicReducer,
  {value: 0}
)

test('decorateReducerWithMachine should return a function', () => {
  const reducer = decorateReducerWithMachine('foo', {})
  expect(typeof reducer).toBe('function')
})

test('decorated reducer should return passed reducer state merged with machine state', () => {
  expect(reducer(undefined, {type: 'ANY'})).toEqual({
    value: 0,
    $$machine: {name: 'foo', current: 'STATE_0', machine: {default: 'STATE_0'}}
  })
})

test('decorated reducer should update on relevant actions', () => {
  expect(
    reducer(
      {
        value: 0,
        $$machine: {
          name: 'foo',
          current: 'STATE_0',
          machine: {default: 'STATE_0'}
        }
      },
      {type: 'TEST', value: 1}
    )
  ).toEqual({
    value: 1,
    $$machine: {
      name: 'foo',
      current: 'STATE_0',
      machine: {default: 'STATE_0'}
    }
  })
})

test('decorated reducer should update on TRANSITION_MACHINE_STATE', () => {
  expect(
    reducer(
      {
        value: 0,
        $$machine: {
          name: 'foo',
          current: 'STATE_0',
          machine: {default: 'STATE_0'}
        }
      },
      {type: TRANSITION_MACHINE_STATE, machineName: 'foo', stateName: 'STATE_1'}
    )
  ).toEqual({
    value: 0,
    $$machine: {
      name: 'foo',
      current: 'STATE_1',
      machine: {default: 'STATE_0'}
    }
  })
})

test('decorated reducer should update on INITIALIZE_MACHINE', () => {
  const r = decorateReducerWithMachine('foo', {})(basicReducer, {
    value: 0
  })
  expect(
    r(
      {
        value: 0,
        $$machine: {
          name: 'foo',
          current: undefined,
          machine: {}
        }
      },
      {
        type: INITIALIZE_MACHINE,
        machineName: 'foo',
        machine: {default: 'STATE_3'}
      }
    )
  ).toEqual({
    value: 0,
    $$machine: {
      name: 'foo',
      current: 'STATE_3',
      machine: {default: 'STATE_3'}
    }
  })
})
