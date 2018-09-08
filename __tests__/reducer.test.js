import { machinesReducer, TRANSITION_MACHINE } from '../source'

test('machinesReducer will return state', () => {
  const state = machinesReducer({ foo: 1 }, { type: 'SOME_ACTION' })
  expect(state).toEqual(state)
})

test('machinesReducer will update state with current stateName', () => {
  const state = machinesReducer(
    { baz: 1 },
    { type: TRANSITION_MACHINE, machineName: 'foo', stateName: 'STATE_1' }
  )
  expect(state).toEqual({
    baz: 1,
    foo: { current: 'STATE_1', last: undefined }
  })
})

test('machinesReducer will save the last state name', () => {
  const state = machinesReducer(
    { foo: { current: 'STATE_0' } },
    { type: TRANSITION_MACHINE, machineName: 'foo', stateName: 'STATE_1' }
  )
  expect(state).toEqual({
    foo: { current: 'STATE_1', last: 'STATE_0' }
  })
})
