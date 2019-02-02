import { combineReducers } from 'redux';

import * as Actions from './actions';

const dialog = (state = [], action) => {
  switch (action.type) {
    case Actions.QUEUE_DIALOG: {
      return [...state, action.dialog];
    }
    case Actions.PUSH_DIALOG: {
      return [action.dialog, ...state];
    }
    case Actions.CLOSE_DIALOG: {
      const [ closed, ...dialogs ] = state;
      return dialogs;
    }
    default:
      return state;
  }
}

const snack = (state = [], action) => {
  switch (action.type) {
    case Actions.QUEUE_SNACK: {
      return [...state, action.snack];
    }
    case Actions.PUSH_SNACK: {
      return [action.snack, ...state];
    }
    case Actions.DISMISS_SNACK: {
      const [ dismissed, ...snacks] = state;
      return snacks;
    }
    default:
      return state;
  }
}


export default combineReducers({
  dialog,
  snack
})
