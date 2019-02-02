import { usernameAvailable, emailAvailable } from "./apiActions";

export const GMapsUrl = key => `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;

export const initScript = (key, src, onload?: any) => {
  // check if script is already in document
  let tag = document.getElementById(key);
  if (!tag) {
    // if script hasn't been added to the document, create it and insert it
    let tag = document.createElement('script');
    tag.type = 'text/javascript';
    tag.async = true;
    tag.id = key;
    tag.src = src;
    tag.onload = () => {
      tag['data-loaded'] = true;
      if (typeof onload === 'function')
        onload && onload();
    };
    document.getElementsByTagName('head')[0].appendChild(tag);
    // console.log('injecting script');
  } else {
    // script already exists
    if (tag['data-loaded']) {
      // script has already been loaded, call onload now
      onload && onload();
    } else {
      // script has been added to dom but not yet loaded, lets chain the onload callback
      const oldOnload: any = tag.onload;
      tag.onload = () => {
        oldOnload && oldOnload();
        onload();
      }
    }
  }
}

export const saveLocally = (key, data) => {
  let storage = window.localStorage;
  try {
    if (!storage) 
      throw new Error('Local Storage not availabe');
    storage.setItem(key, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

export const loadLocally = (key) => {
  let storage = window.localStorage;
  if (!storage) return null;
  try {
    return JSON.parse(storage.getItem(key));
  } catch (e) {
    console.error(e);
    return null;
  }
}

export class Validate {

  static Length(length) {
    return value => {
      if (value.length < length) {
        return { valid: false, message: `must be ${length} characters long` };
      }
      return true;
    }
  }

  static async Email(value: string) {
    const emailRegex = /^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
    if (!emailRegex.test(value))
      return { valid: false, message: `must be a valid email` };
    if (!await emailAvailable(value))
      return { valid: false, message: `that email is taken` };
    return true;
  }

  static Password(length: number = 8, { mixCase = true, nums = true } = {}) {
    return value => {
      if (value.length < length) {
        return { valid: false, message: `must be ${length} characters long`};
      }
      if (mixCase && (value.toLowerCase() === value || value.toUpperCase() === value)) {
        return { valid: false, message: `must container uppercase and lowercase letters` };
      }

      if (nums && !(/[0-9]/.test(value) && /[a-zA-Z]/.test(value))) {
        return { valid: false, message: `must contain a mix of alphanumeric characters`}
      }
      return true;
    }
  }

  static Match(key) {
    return (value, rest) => {
      if (value !== rest[key]) {
        return { valid: false, message: 'Doesn\'t match' }
      }
      return true;
    }
  }

  static async Username(value) {
    const length = 3;
    if (value.length < length)
      return { valid: false, message: `must be ${length} characters long` };
    if (!await usernameAvailable(value))
      return { valid: false, message: `that username is taken` };
    return true;
  }
}
