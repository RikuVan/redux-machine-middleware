import {
  getMachineState,
  getMachineStateFromDecorated,
  MACHINE_STATE
} from '../source'

const state = {
  foo: {__$machine: {current: 'STATE_1'}}
}

const state2 = {
  foo1: {__$machine: {current: 'STATE_1'}}
}

const defaultReducerState = {
  machines: {foo: {current: 'STATE_1'}}
}

const defaultReducerState2 = {
  machines1: {foo: {current: 'STATE_1'}}
}

test('should get current stateName or null from state from decorated reducer', () => {
  expect(getMachineStateFromDecorated('foo')(state)).toEqual('STATE_1')
})

test('should get current null from state from decorated reducer if incorrect keys used', () => {
  expect(getMachineStateFromDecorated('foo')(state2)).toEqual(null)
})

test('should get current stateName from state from default reducer', () => {
  expect(getMachineState('foo')(defaultReducerState)).toEqual('STATE_1')
})

test('should get current null from state from default reducer if incorrect keys used', () => {
  expect(getMachineState('foo')(defaultReducerState2)).toEqual(null)
})
