/**
 * Destination match cards — renders the matcher's shortlist with every
 * reason on display, so the recommendation is an argument, not an oracle.
 */

import { el, reasonList, fill } from './dom.js';
import { SHORTLIST_SIZE } from '../engine/matcher.js';

const SEASON_BADGE = {
  peak: { label: 'Prime season', class: 'badge season-peak' },
  shoulder: { label: 'Shoulder season', class: 'badge season-shoulder' },
  off: { label: 'Off season', class: 'badge season-off' },
};

function matchCard(entry, isTop, onChoose) {
  const { destination, season } = entry;
  const badge = SEASON_BADGE[season];
  return el('article', { class: `card match-card${isTop ? ' top-pick' : ''}` }, [
    isTop ? el('p', { class: 'badge top-badge' }, 'Top match') : null,
    el('h3', {}, destination.name),
    el('p', { class: 'muted small' }, `${destination.state} · ${destination.region} India`),
    el('p', { class: badge.class }, badge.label),
    el('p', { class: 'tagline-small' }, destination.tagline),
    reasonList(entry.reasons),
    el(
      'button',
      { type: 'button', class: 'primary', onclick: () => onChoose(entry) },
      `Build my ${destination.name} itinerary`
    ),
  ]);
}

/**
 * @param {HTMLElement} container
 * @param {{ranked: Array}} result from rankDestinations()
 * @param {(entry: object) => void} onChoose
 */
export function renderMatches(container, result, onChoose) {
  fill(
    container,
    result.ranked.slice(0, SHORTLIST_SIZE).map((entry, i) => matchCard(entry, i === 0, onChoose))
  );
}
