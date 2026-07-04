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
  // No persistent aria-live here: a page can hold a dozen-plus story blocks,
  // and that many idle live regions is noise. The result appears right after
  // the button in reading order, and generate() moves focus onto it, so
  // screen-reader users still land on the new content.
  const output = el('div', { class: 'story-output', tabindex: '-1' });
  const button = el(
    'button',
    { type: 'button', class: 'secondary story-btn', onclick: () => generate() },
    `✨ Longer story: ${subject.label}`
  );

  // In-flight guard instead of button.disabled: disabling a focused button
  // dumps keyboard focus to <body>. aria-busy signals the wait without
  // stealing focus, and the guard blocks double-submits.
  let busy = false;

  async function generate() {
    if (busy) return;
    const apiKey = getApiKey();
    if (!apiKey) {
      output.replaceChildren(el('p', { class: 'muted small' }, NO_KEY_HINT));
      return;
    }
    busy = true;
    button.setAttribute('aria-busy', 'true');
    output.replaceChildren(el('p', { class: 'muted small' }, 'Weaving the story from our fact-checked notes…'));
    try {
      const { title, story } = await tellStory(subject, apiKey);
      // The generated title is decorative, not a document landmark — a styled
      // paragraph, so it never breaks the page's heading hierarchy.
      output.replaceChildren(
        el('p', { class: 'story-title' }, el('strong', {}, title)),
        el('p', { class: 'story-text' }, story),
        el('p', { class: 'muted small' }, 'AI-woven strictly from the fact-checked notes in our catalog.')
      );
      output.focus();
    } catch (err) {
      output.replaceChildren(el('p', { class: 'error small' }, `Story mode hit a snag: ${err.message}`));
    } finally {
      busy = false;
      button.removeAttribute('aria-busy');
    }
  }

  return el('div', { class: 'story-block' }, [button, output]);
}
