import * as Actions from './actions';

const initialState = {}

export default (state=initialState, action) => {
  switch (action.type) {
    case Actions.USER_LOGGED_IN: {
      return action.user;
    }
    default:
      return state;
  }
}
