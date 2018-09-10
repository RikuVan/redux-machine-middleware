export const TRANSITION_MACHINE_STATE = '@@machine/TRANSITION_STATE'
export const INITIALIZE_MACHINE = '@@machine/INITIALIZE'
export const MACHINE_STATE =
  typeof Symbol !== 'undefined' ? Symbol('machine') : '__$machine'

/*~*~*~*~*~*~*~*~*~*~*~* ACTIONS *~*~*~*~*~*~*~*~*~*~*~*/
export const transitionTo = (machineName, stateName) => ({
  type: TRANSITION_MACHINE_STATE,
  machineName,
  stateName
})

export const initializeMachine = (machineName, machine) => ({
  type: INITIALIZE_MACHINE,
  machineName,
  machine
})

/*~*~*~*~*~*~*~*~*~*~*~* REDUCERS *~*~*~*~*~*~*~*~*~*~*~*/

// centralize all machine states in one reducer
export const machinesReducer = (state = {}, action) => {
  if (action.type === TRANSITION_MACHINE_STATE) {
    const updatedMachine = {
      ...state[action.machineName],
      current: action.stateName,
      last: state[action.machineName]
        ? state[action.machineName].current
        : undefined
    }
    return {...state, [action.machineName]: updatedMachine}
  }
  return state
}

const machineReducer = (state, action) => {
  if (
    action.type === TRANSITION_MACHINE_STATE &&
    state[MACHINE_STATE].name &&
    action.machineName === state[MACHINE_STATE].name
  ) {
    return {
      ...state,
      [MACHINE_STATE]: {...state[MACHINE_STATE], current: action.stateName}
    }
  }
  if (action.type === INITIALIZE_MACHINE) {
    const {machine, machineName: name} = action
    return {
      ...state,
      [MACHINE_STATE]: {
        current: machine.default,
        name,
        machine
      }
    }
  }
  return state
}

// alternative: decorate a reducer with a machine
export const decorateReducerWithMachine = (name, machine) => (
  decoratedReducer,
  initialState
) => {
  const initialMachineState = {
    [MACHINE_STATE]: {
      current: machine.default,
      name,
      machine
    }
  }
  const initialMergedState = {...initialState, ...initialMachineState}
  return (prevState, action) => {
    const prevStateIsUndefined = typeof prevState === 'undefined'
    const valueIsUndefined = typeof action === 'undefined'
    if (prevStateIsUndefined && valueIsUndefined) {
      return initialMergedState
    }
    return [machineReducer, decoratedReducer].reduce((newState, reducer) => {
      return reducer(newState, action)
    }, prevStateIsUndefined && !valueIsUndefined ? initialMergedState : prevState)
  }
}

/*~*~*~*~*~*~*~*~*~*~*~* CREATE MIDDLEWARE *~*~*~*~*~*~*~*~*~*~*~*/
export function createMachineMiddleware(initialMachines = {}, options = {}) {
  return ({dispatch, getState}) => next => action => {
    const validate = !!options.strict
    const currentStoreState = getState()
    const machines = mergeMachines(initialMachines, currentStoreState)
    // is empty of nil
    if (isEmptyObj(machines) && validate) {
      throw new Error(
        'missing initial machine state: add the machineReducer to combineReducer or use the decorator to add machines to your reducers'
      )
    }
    let nextAction
    if (has('type', action) && action.type === TRANSITION_MACHINE_STATE) {
      validate && validateTransitionAction(machines, action, currentStoreState)
      for (const currentMachine of Object.values(machines)) {
        const nextState = findState(currentMachine, action.stateName)
        if (has('before', nextState)) {
          dispatch(nextState.before({dispatch, getState, action}))
        }
        nextAction = next(action)
        if (has('after', nextState)) {
          dispatch(nextState.after({dispatch, getState, action}))
        }
      }
    } else {
      for (const [machineName, currentMachine] of Object.entries(machines)) {
        const currentInStore = getCurrentInStore(machineName, currentStoreState)

        const currentState = findStateWithDefault(
          currentMachine,
          currentInStore
        )
        if (
          Array.isArray(currentState.autoTransitions) &&
          currentState.autoTransitions.length
        ) {
          // may optionally specific the slice of state to check
          const storeState = getStoreStateForCond(
            currentMachine,
            currentStoreState
          )
          for (const transition of currentState.autoTransitions) {
            validate && validateTransitionObj(transition)
            const shouldTransition = getShouldTransition(
              transition.cond,
              storeState,
              action
            )
            if (
              typeof shouldTransition === 'undefined' &&
              transition.cond &&
              validate
            ) {
              throw new Error(
                'Ensure your cond function returns a truthy or falsey value'
              )
            }
            if (shouldTransition) {
              const nextState = getNextStateName(
                currentMachine.states,
                currentState.name,
                transition.to
              )
              if (has('before', transition)) {
                dispatch(
                  transition.before({
                    getState,
                    dispatch,
                    action
                  })
                )
              }
              dispatch(transitionTo(machineName, nextState))
              if (has('after', transition)) {
                dispatch(
                  transition.after({
                    getState,
                    dispatch,
                    action
                  })
                )
              }
              break
            }
          }
        }
      }
    }
    return nextAction || next(action)
  }
}

/*~*~*~*~*~*~*~*~*~*~*~* HELPERS *~*~*~*~*~*~*~*~*~*~*~*/
function mergeMachines(machines, state = {}) {
  return Object.values(state).reduce((acc, stateSlice) => {
    if (stateSlice[MACHINE_STATE] && stateSlice[MACHINE_STATE].name) {
      acc[stateSlice[MACHINE_STATE].name] = stateSlice[MACHINE_STATE].machine
    }
    return acc
  }, machines || {})
}

function getCurrentInStore(machineName, currentStoreState) {
  if (currentStoreState.machines && currentStoreState.machines[machineName]) {
    return currentStoreState.machines[machineName]
  }
  const machine = Object.values(currentStoreState).find(
    slice => slice[MACHINE_STATE] && slice[MACHINE_STATE].name === machineName
  )
  if (machine) {
    return machine[MACHINE_STATE].current
  }
  return undefined
}

function getStoreStateForCond(currentMachine, storeState) {
  if (Array.isArray(currentMachine.selector)) {
    return currentMachine.selector.reduce(function(obj, prop) {
      return has(prop, obj) ? obj[prop] : obj
    }, storeState)
  }
  return storeState
}

function validateTransitionAction(machines, action, storeState) {
  const machine = machines[action.machineName]
  if (!machine) {
    throwMissingMachineError(machines, action.machineName)
  }
  // we are checking the state before the one in the action
  // to see if the new one is valid
  const currentName = getCurrentInStore(storeState, action.stateName)
  const currentState = findStateWithDefault(machine, currentName)
  if (currentState && currentState.validTransitions) {
    if (
      !currentState.validTransitions
        .concat(machine.default)
        .includes(action.stateName)
    ) {
      throwInvalidTransitionError(currentState.name, action.stateName)
    }
  } else if (currentState) {
    console.warn(`Please add a validTransitions array for ${currentState.name}`)
  }
}

function validateTransitionObj(transition) {
  Object.keys(transition).forEach(key => {
    switch (key) {
      case 'before':
      case 'after':
      case 'cond': {
        if (!is(transition[key], 'Function')) {
          throwTypeError(transition[key], 'function')
        }
        return
      }
      case 'to': {
        // custom properties can be added with a underscore or dollar sign prefix
        if (!is(transition[key], 'String')) {
          throwTypeError(transition[key], 'string')
        }
        return
      }
      default: {
        if (hasPrefix(key)) return
        throw new TypeError(
          `${key} is not a valid property for autoTransition configuration`
        )
      }
    }
  })
}

function hasPrefix(val) {
  return /^[$_]/i.test(val)
}

function throwTypeError(val, type) {
  throw new TypeError(
    `'${val}' is not of the correct type, it should be a ${type}`
  )
}

function findState(machine, stateName) {
  return machine.states.find(state => state.name === stateName)
}

// FIXME: different shapes for data from decorated vs central reducer
function findStateWithDefault(machine, machineState) {
  const current =
    machineState && has('current', machineState)
      ? machineState.current
        ? is(machineState, String)
        : machineState
      : machine.default
  return findState(machine, current)
}

function throwInvalidTransitionError(currentStateName, newStateName) {
  throw new Error(
    `'${newStateName}' is not listed in valid transitions for state ${currentStateName}`
  )
}

function throwMissingMachineError(machines, machineName) {
  const machineNames = Object.keys(machines).join(', ')
  throw new Error(
    `no state machine exist for name ${machineName}, current machines include ${machineNames}`
  )
}

function getShouldTransition(test, state, action) {
  return test && test(state, action)
}

function getNextStateName(states, currentStateName, newState, strict) {
  return strict ? getNewState(states, currentStateName, newState) : newState
}

function getNewState(states, oldState, newState) {
  const nextState = states.find(state => state.name === newState)
  if (!nextState) {
    const validStates = states.map(state => state.name).join(', ')
    throw new Error(
      `Invalid transition from state '${oldState}' to '${newState}'. Valid states are: ${validStates}.`
    )
  }
  return nextState
}

function has(prop, obj) {
  return (
    typeof obj === 'object' && Object.prototype.hasOwnProperty.call(obj, prop)
  )
}

function is(val, Type) {
  return Object.prototype.toString.call(val) === `[object ${Type}]`
}

function isEmptyObj(val) {
  return Object.keys(val).length === 0
}
