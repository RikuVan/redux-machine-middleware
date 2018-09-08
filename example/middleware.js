export const TRANSITION_MACHINE = '@@TRANSITION_MACHINE'

/*~*~*~*~*~*~*~*~*~*~*~* ACTIONS *~*~*~*~*~*~*~*~*~*~*~*/
export const transitionTo = (machineName, stateName) => ({
  type: TRANSITION_MACHINE,
  machineName,
  stateName
})

/*~*~*~*~*~*~*~*~*~*~*~* REDUCER *~*~*~*~*~*~*~*~*~*~*~*/
export const machinesReducer = (state = {}, action) => {
  if (action.type === TRANSITION_MACHINE) {
    const updatedMachine = {
      ...state[action.machineName],
      current: action.stateName,
      last: state[action.machineName]
        ? state[action.machineName].current
        : undefined
    }
    return { ...state, [action.machineName]: updatedMachine }
  }
  return state
}

/*~*~*~*~*~*~*~*~*~*~*~* CREATE MIDDLEWARE *~*~*~*~*~*~*~*~*~*~*~*/
function createMachineMiddleware(machines, options = {}) {
  return ({ dispatch, getState }) => next => action => {
    const validate = !!options.strict
    const currentStoreState = getState()
    if (!currentStoreState.machines && validate) {
      throw new Error(
        'missing initial machine state: add the machineReducer to combineReducer'
      )
    }
    const allMachines = Object.entries(machines)
    let nextAction
    if (has('type', action) && action.type === TRANSITION_MACHINE) {
      validate &&
        validateTransitionAction(
          machines,
          machines[action.machineName],
          action,
          currentStoreState.machines[action.machineName]
        )
      for (const [_, currentMachine] of allMachines) {
        const nextState = findState(currentMachine, action.stateName)
        if (has('before', nextState)) {
          dispatch(nextState.before({ dispatch, getState, action }))
        }
        nextAction = next(action)
        if (has('after', nextState)) {
          dispatch(nextState.after({ dispatch, getState, action }))
        }
      }
    } else {
      for (const [machineName, currentMachine] of allMachines) {
        const currentState = findStateWithDefault(
          currentMachine,
          currentStoreState.machines[machineName]
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
            const shouldTransition = getShouldTransition(
              transition.cond,
              storeState,
              action
            )
            if (typeof shouldTransition === 'undefined' && validate) {
              throw new Error(
                'Ensure your cond function returns a truthy or falsey value'
              )
            }
            if (shouldTransition) {
              validate && validateTransitionObj(transition)
              const nextState = getNextStateName(
                currentMachine.states,
                currentState.name,
                transition.to
              )
              if (has('before', transition)) {
                dispatch(transition.before({ getState, dispatch, action }))
              }
              dispatch(transitionTo(machineName, nextState))
              if (has('after', transition)) {
                dispatch(transition.after({ getState, dispatch, action }))
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
function getStoreStateForCond(currentMachine, storeState) {
  if (Array.isArray(currentMachine.selector)) {
    return currentMachine.selector.reduce(function(obj, prop) {
      return has(prop, obj) ? obj[prop] : obj
    }, storeState)
  }
  return storeState
}

function validateTransitionAction(
  machines,
  machine,
  action,
  currentMachineState
) {
  if (!machine) {
    throwMissingMachineError(machines, action.machineName)
  }
  // we are checking the state before the one in the action
  // to see if the new one is valid
  const currentState = findStateWithDefault(
    machine,
    action.stateName,
    currentMachineState
  )
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
        if (!is(transition[key], 'String')) {
          throwTypeError(transition[key], 'string')
        }
        return
      }
      default: {
        throw new Error(
          `${key} is not a valid property for transition configuration`
        )
      }
    }
  })
}

function throwTypeError(val, type) {
  throw new TypeError(
    `'${val}' is not of the correct type, it should be a ${type}`
  )
}

function findState(machine, stateName) {
  return machine.states.find(state => state.name === stateName)
}

function findStateWithDefault(machine, machineState) {
  const current =
    machineState && machineState.current
      ? machineState.current
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

export default createMachineMiddleware
