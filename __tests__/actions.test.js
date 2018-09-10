import {
  TRANSITION_MACHINE_STATE,
  INITIALIZE_MACHINE,
  transitionTo,
  initializeMachine
} from '../source/'
import {initialMachines} from './transitions.test'

test('transitionTo()', () => {
  const action = transitionTo('foo', 'STATE_1')
  expect(action.type).toBe(TRANSITION_MACHINE_STATE)
  expect(action.machineName).toBe('foo')
  expect(action.stateName).toBe('STATE_1')
})

test('initializeMachine()', () => {
  const action = initializeMachine('foo', initialMachines.foo)
  expect(action.type).toBe(INITIALIZE_MACHINE)
  expect(action.machineName).toBe('foo')
  expect(action.machine).toBe(initialMachines.foo)
})
