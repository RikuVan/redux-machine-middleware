import {createMachineMiddleware as middleware} from '../source'

const doDispatch = v => v
const doGetState = () => ({
  machines: {}
})
const nextHandler = middleware({})({
  dispatch: doDispatch,
  getState: doGetState
})

test('must return a function to handle next', () => {
  expect(nextHandler).isFunction
  expect(nextHandler.length).toBe(1)
})

test('return a function to handle action', () => {
  const actionHandler = nextHandler()
  expect(actionHandler).isFunction
  expect(actionHandler.length).toBe(1)
})

test('return a function to handle action', () => {
  const actionHandler = nextHandler()
  expect(actionHandler).not.isFunction
})

it('should pass the intercepted action to next', () => {
  const nextArgs = []
  const doNext = (...args) => {
    return nextArgs.push(args)
  }
  const action = {type: 'INC'}
  const result = nextHandler(doNext)(action)
  console.log('here', result)
  expect(nextArgs[0]).toEqual([action])
})
