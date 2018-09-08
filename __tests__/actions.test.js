import {TRANSITION_MACHINE, transitionTo} from '../source/'

test('transitionTo', () => {
  const action = transitionTo('foo', 'STATE_1')
  expect(action.type).toEqual(TRANSITION_MACHINE)
  expect(action.machineName).toEqual('foo')
  expect(action.stateName).toEqual('STATE_1')
})
