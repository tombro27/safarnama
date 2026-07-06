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

/**
 * Card for a grounded AI recommendation. The fitReason is the model's
 * natural-language argument; the highlights are real catalog attractions
 * (resolved by the fence), and a rule-based cross-check keeps the AI honest.
 */
function aiMatchCard(rec, isTop, rankLookup, onChoose) {
  const { destination } = rec;
  const detRank = rankLookup.get(destination.id);
  return el('article', { class: `card match-card${isTop ? ' top-pick' : ''}` }, [
    el('p', { class: 'badge ai-badge' }, isTop ? '✨ AI top pick' : '✨ AI-reasoned'),
    el('h3', {}, destination.name),
    el('p', { class: 'muted small' }, `${destination.state} · ${destination.region} India`),
    el('p', { class: 'tagline-small' }, destination.tagline),
    el('p', { class: 'ai-reason' }, rec.fitReason),
    rec.highlights.length > 0
      ? el('p', { class: 'small' }, [
          el('strong', {}, 'Don’t miss: '),
          rec.highlights.map((a) => a.name).join(' · '),
        ])
      : null,
    rec.watchOut ? el('p', { class: 'etiquette small' }, `Worth knowing: ${rec.watchOut}`) : null,
    detRank
      ? el('p', { class: 'muted small' }, `Rule-based engine cross-check: ranks this #${detRank} of ${rankLookup.size}`)
      : null,
    el(
      'button',
      { type: 'button', class: 'primary', onclick: () => onChoose({ destination }) },
      `Build my ${destination.name} itinerary`
    ),
  ]);
}

/**
 * Render grounded AI recommendations, with a transparency note when the
 * fence discarded any hallucinated suggestion.
 *
 * @param {HTMLElement} container
 * @param {{recommendations: Array, rejected: string[]}} grounded from recommendDestinations()
 * @param {Map<string, number>} rankLookup destinationId → rule-based rank (1-based)
 * @param {(entry: {destination: object}) => void} onChoose
 */
export function renderAiMatches(container, grounded, rankLookup, onChoose) {
  const cards = grounded.recommendations.map((rec, i) =>
    aiMatchCard(rec, i === 0, rankLookup, onChoose)
  );
  if (grounded.rejected.length > 0) {
    cards.push(
      el('p', { class: 'muted small' },
        `Fenced out ${grounded.rejected.length} AI suggestion(s) not in our catalog — the model only gets to pick real, fact-checked places.`)
    );
  }
  fill(container, cards);
}
