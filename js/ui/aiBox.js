/**
 * The "describe your trip" box — wiring for GenAI feature 1.
 *
 * Owns the Gemini API key lifecycle: typed key → tab session storage,
 * "Forget key" wipes it. Also the single place other views ask for the
 * key (story mode reuses it), so key handling has exactly one owner.
 */

import { parseTripDescription } from '../ai/tripParser.js';
import { readSessionKey, writeSessionKey, clearSessionKey } from './storage.js';

const KEY_NAME = 'geminiKey';

/** The current key: freshly typed wins (and is remembered for the tab). */
export function getApiKey() {
  const field = document.getElementById('ai-key');
  const typed = field.value.trim();
  if (typed) {
    writeSessionKey(KEY_NAME, typed);
    return typed;
  }
  return readSessionKey(KEY_NAME);
}

/**
 * Attach behaviour to the AI box.
 *
 * @param {{onContext: (raw: object) => void}} handlers called with the
 *   parsed raw context on success — the caller normalizes and fills the form
 */
export function wireAiBox({ onContext }) {
  const textField = document.getElementById('ai-text');
  const keyField = document.getElementById('ai-key');
  const status = document.getElementById('ai-status');
  const parseBtn = document.getElementById('ai-parse');
  const forgetBtn = document.getElementById('ai-clear-key');

  keyField.value = readSessionKey(KEY_NAME);

  forgetBtn.addEventListener('click', () => {
    clearSessionKey(KEY_NAME);
    keyField.value = '';
    status.textContent = 'Key forgotten.';
  });

  parseBtn.addEventListener('click', async () => {
    const text = textField.value.trim();
    const apiKey = getApiKey();
    if (!text) {
      status.textContent = 'Describe your trip first — a sentence is plenty.';
      return;
    }
    if (!apiKey) {
      status.textContent = 'Paste a Gemini API key, or just use the form below.';
      return;
    }

    parseBtn.disabled = true;
    status.textContent = 'Reading your trip…';
    try {
      const raw = await parseTripDescription(text, apiKey);
      onContext(raw);
      status.textContent = 'Form filled from your words — review it, then find your destinations.';
    } catch (err) {
      status.textContent = `${err.message} You can always use the form below.`;
    } finally {
      parseBtn.disabled = false;
    }
  });
}
