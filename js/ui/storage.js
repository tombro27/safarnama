/**
 * Guarded browser-storage wrappers.
 *
 * Storage can be blocked (private mode, embedded webviews) or corrupted;
 * every read/write here degrades gracefully to "no stored value" instead
 * of throwing into the UI.
 */

const PREFIX = 'safarnama.';

/** The Gemini key lives in the tab's session storage only. */
export function readSessionKey(name) {
  try {
    return sessionStorage.getItem(PREFIX + name) ?? '';
  } catch {
    return '';
  }
}

export function writeSessionKey(name, value) {
  try {
    sessionStorage.setItem(PREFIX + name, value);
  } catch {
    /* storage blocked — the key still works from the input field */
  }
}

export function clearSessionKey(name) {
  try {
    sessionStorage.removeItem(PREFIX + name);
  } catch {
    /* nothing to clear */
  }
}

/** Last-used trip context persists across visits (localStorage, JSON). */
export function readJson(name) {
  try {
    const raw = localStorage.getItem(PREFIX + name);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeJson(name, value) {
  try {
    localStorage.setItem(PREFIX + name, JSON.stringify(value));
  } catch {
    /* storage blocked — the session simply won't be remembered */
  }
}
