/**
 * Story mode — the UI face of GenAI feature 2.
 *
 * Every place already shows its hand-written catalog story, so
 * storytelling never depends on a key. This block adds the "✨ Longer
 * story" button that asks Gemini to weave a grounded narrative; failures
 * and the no-key case are explained in place, never faked.
 */

import { tellStory } from '../ai/storyteller.js';
import { el } from './dom.js';
import { getApiKey } from './aiBox.js';

const NO_KEY_HINT =
  'Add a Gemini API key in the ✨ box at the top to unlock AI storytelling — the story above is our own, and it isn\'t going anywhere.';

/**
 * A story-mode block for one subject.
 *
 * @param {{label: string, prompt: string}} subject from js/ai/storyteller.js
 * @returns {HTMLElement}
 */
export function storyBlock(subject) {
  const output = el('div', { class: 'story-output', role: 'status', 'aria-live': 'polite' });
  const button = el(
    'button',
    { type: 'button', class: 'secondary story-btn', onclick: () => generate() },
    `✨ Longer story: ${subject.label}`
  );

  async function generate() {
    const apiKey = getApiKey();
    if (!apiKey) {
      output.replaceChildren(el('p', { class: 'muted small' }, NO_KEY_HINT));
      return;
    }
    button.disabled = true;
    output.replaceChildren(el('p', { class: 'muted small' }, 'Weaving the story from our fact-checked notes…'));
    try {
      const { title, story } = await tellStory(subject, apiKey);
      output.replaceChildren(
        el('h5', { class: 'story-title' }, title),
        el('p', { class: 'story-text' }, story),
        el('p', { class: 'muted small' }, 'AI-woven strictly from the fact-checked notes in our catalog.')
      );
    } catch (err) {
      output.replaceChildren(el('p', { class: 'error small' }, `Story mode hit a snag: ${err.message}`));
    } finally {
      button.disabled = false;
    }
  }

  return el('div', { class: 'story-block' }, [button, output]);
}
