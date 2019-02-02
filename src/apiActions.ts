import { loadLocally, saveLocally } from "./utils";
import { fetchJson } from "app/store";


export function getApiUrl(path) {
  const root = '//localhost:5000/api/v2'
  return root+path;
}

export const AUTH_TOKEN_KEY = 'pathgrab.token';

const builder = async (url, payload = null, lookForToken = false) => await fetchJson(url, payload, lookForToken);


// user actions
export const usernameAvailable = async username => (await builder(`/user/username/available/${username}`)).available;
export const emailAvailable = async email => (await builder(`/user/email/available/${email}`)).available;

export const register = async payload => await builder(`/user/register`, payload);
export const login = async payload => await builder(`/user/login`, payload);


// LEGACY ENDPOINTS

// region actions
// export const 
