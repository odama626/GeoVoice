import React from 'react';
import { Provider } from 'react-redux';
import { createStore, combineReducers, compose, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';

import { loadLocally, saveLocally } from '../utils';
import { AUTH_TOKEN_KEY, getApiUrl } from '../apiActions';
import builtin from 'components/builtin/reducer';
import regions from 'components/mapRouter/reducer';
import user from 'components/user/reducer';

const rootReducer = combineReducers({
  builtin,
  regions,
  user
});

const logger = store => next => action => {
  console.group(action.type)
  console.info('dispatching', action)
  let result = next(action)
  console.log('next state', store.getState())
  console.groupEnd()
  return result
}

const composedEnhancers = compose(
  applyMiddleware(logger, thunk)
)

const store = createStore(rootReducer, undefined, composedEnhancers);

export default ({ children }) => (
  <Provider store={store}>
    { children }
  </Provider>
)


export async function fetchJson(url, payload = null, lookForToken = false) {
  const jwtToken = loadLocally(AUTH_TOKEN_KEY);
  const opts = {
    method: payload ? 'POST' : 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': jwtToken
    },
    body: payload && JSON.stringify(payload)
  }
  return await fetch(getApiUrl(url), opts)
    .then(r => {
      if (!r.ok) throw r;
      if (lookForToken && r.headers.has('Authorization')) {
        saveLocally(AUTH_TOKEN_KEY, r.headers.get('Authorization'));
      }
      return r;
    })
    .then(r =>r.text())
    .then(r => {
      try {
        let json = JSON.parse(r);
        if (lookForToken) {
          // store.dispatch(loadUser(json));
        }
        return json;
      } catch(e) {
        return r;
      }
    }).catch(error => ({ error }));
}
