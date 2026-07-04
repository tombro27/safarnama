/**
 * Discovery sections — hidden gems, festivals for the traveler's month,
 * and authentic experiences with etiquette and who benefits. This is the
 * "engage with local culture" half of the app.
 */

import { el, reasonList, rupees, fill } from './dom.js';
import { monthName } from '../engine/events.js';
import { attractionStorySubject } from '../ai/storyteller.js';
import { storyBlock } from './storyMode.js';

/** 💎 Hidden gems, ranked for this traveler. */
export function renderGems(container, gems, destination) {
  if (gems.length === 0) {
    fill(container, el('p', { class: 'muted' }, 'No catalog gems here — the famous sights carry this one.'));
    return;
  }
  fill(
    container,
    gems.map((gem) =>
      el('article', { class: 'card gem-card' }, [
        el('h4', {}, gem.attraction.name),
        el('p', { class: 'muted small' }, `${gem.attraction.kind} · ${gem.attraction.zone.replaceAll('-', ' ')}`),
        el('p', { class: 'story' }, gem.attraction.story),
        reasonList(gem.reasons),
        storyBlock(attractionStorySubject(destination, gem.attraction)),
      ])
    )
  );
}

function festivalCard(festival, heading) {
  return el('article', { class: 'card festival-card' }, [
    el('h4', {}, heading),
    el('p', {}, festival.description),
    el('p', {}, `Why go: ${festival.whyGo}`),
    el('p', { class: 'etiquette' }, `Show up well: ${festival.etiquette}`),
    el('p', { class: 'muted small' }, 'Dates shift with the lunar calendar — verify before you book.'),
  ]);
}

/**
 * 🪔 Festivals: matches for the month when they exist; otherwise the
 * honest empty state — when to come back, and for what.
 */
export function renderEvents(container, { now, next, month }) {
  if (now.length > 0) {
    fill(container, now.map((f) => festivalCard(f, `${f.name} — in ${monthName(month)}, while you're there`)));
    return;
  }
  const children = [
    el('p', { class: 'muted' }, `No major festival here in ${monthName(month)} — we won't pretend otherwise.`),
  ];
  if (next) {
    children.push(
      festivalCard(next.festival, `Worth a return: ${next.festival.name} (${monthName(next.month)})`)
    );
  }
  fill(container, children);
}

function experienceCard(entry) {
  const { experience } = entry;
  return el('article', { class: `card experience-card${entry.splurge ? ' splurge' : ''}` }, [
    el('div', { class: 'day-item-head' }, [
      el('h4', {}, experience.name),
      entry.splurge ? el('span', { class: 'badge splurge-badge' }, 'Splurge') : null,
    ]),
    el('p', { class: 'muted small' }, `${experience.kind} · about ${experience.hours}h · ${experience.cost === 0 ? 'free' : `${rupees(experience.cost)}/person`}`),
    el('p', {}, experience.description),
    reasonList(entry.reasons),
    el('p', { class: 'etiquette' }, `Show up well: ${experience.etiquette}`),
    el('p', { class: 'supports' }, `Your money goes to: ${experience.supportsLocals}`),
  ]);
}

/** 🤝 Authentic experiences, party- and budget-aware. */
export function renderExperiences(container, { matches, partyRelaxed }, ctx) {
  const children = [];
  if (partyRelaxed) {
    children.push(
      el('p', { class: 'muted small' }, `Nothing tagged for ${ctx.party} travellers specifically — showing everything; use your judgement.`)
    );
  }
  children.push(...matches.map(experienceCard));
  fill(container, children);
}
