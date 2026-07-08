/**
 * Itinerary view — the day-by-day plan, with every choice explained,
 * evenings programmed, the honest cost estimate, and story mode woven in.
 */

import { el, reasonList, rupees, fill } from './dom.js';
import { INTERESTS } from '../engine/context.js';
import { monthName } from '../engine/events.js';
import { attractionStorySubject, destinationStorySubject } from '../ai/storyteller.js';
import { storyBlock } from './storyMode.js';
import { photoFor } from './photos.js';
import { icon, KIND_ICON } from './icons.js';

function contextLine(ctx) {
  const interests = ctx.interests.map((k) => INTERESTS[k].toLowerCase()).join(', ');
  return `${ctx.days} ${ctx.pace} day(s) in ${monthName(ctx.month)} · ${ctx.party} · ${ctx.budget} budget · drawn to ${interests}`;
}

/** A wide hero banner for the chosen destination, name overlaid on the photo. */
function tripHero(destination) {
  const photo = photoFor(destination.id);
  const overlay = el('div', { class: 'on-photo' }, [
    el('h3', {}, `${destination.name}, ${destination.state}`),
  ]);
  const inner = photo
    ? [el('img', { src: photo.src, alt: photo.alt }), overlay]
    : [el('div', { class: 'photo-fallback' }, destination.name), overlay];
  return el('div', { class: 'card-photo trip-hero' }, inner);
}

/** Destination intro: hero photo, heritage summary + a city-level story block. */
export function renderTripIntro(container, plan) {
  const { destination } = plan;
  fill(container, [
    tripHero(destination),
    el('p', { class: 'muted small' }, contextLine(plan.context)),
    el('p', { class: 'heritage' }, destination.heritage),
    storyBlock(destinationStorySubject(destination)),
  ]);
}

function itemBadges(item) {
  const badges = [];
  if (item.anchor) badges.push(el('span', { class: 'badge anchor' }, 'Signature'));
  if (item.gem) badges.push(el('span', { class: 'badge gem' }, 'Hidden gem'));
  return badges;
}

function itemMeta(attraction) {
  const entry = attraction.entryCost === 0 ? 'free entry' : `entry ${rupees(attraction.entryCost)}`;
  return `${attraction.kind} · about ${attraction.hours}h · ${entry}`;
}

function dayItem(item, destination) {
  const { attraction } = item;
  const kindIcon = icon(KIND_ICON[attraction.kind] ?? 'pin', { size: 18, className: 'title-icon' });
  return el('li', { class: 'day-item' }, [
    el('div', { class: 'day-item-head' }, [kindIcon, el('strong', {}, attraction.name), ...itemBadges(item)]),
    el('p', { class: 'muted small' }, itemMeta(attraction)),
    reasonList(item.why),
    el('p', { class: 'story' }, attraction.story),
    storyBlock(attractionStorySubject(destination, attraction)),
  ]);
}

function eveningBlock(evening, month) {
  if (!evening) return null;
  if (evening.type === 'festival') {
    const f = evening.festival;
    return el('div', { class: 'evening festival' }, [
      el('h5', {}, `Evening — ${f.name}`),
      el('p', {}, f.description),
      el('p', {}, `Why go: ${f.whyGo}`),
      el('p', { class: 'etiquette' }, `Show up well: ${f.etiquette}`),
      el('p', { class: 'muted small' }, `Usually falls in ${monthName(month)} — dates shift with the lunar calendar, verify before you plan around it.`),
    ]);
  }
  const { experience, reasons } = evening.entry;
  return el('div', { class: 'evening' }, [
    el('h5', {}, `Evening — ${experience.name}`),
    el('p', {}, experience.description),
    reasonList(reasons),
    el('p', { class: 'etiquette' }, `Show up well: ${experience.etiquette}`),
  ]);
}

/** The day cards. */
export function renderTripDays(container, plan) {
  fill(
    container,
    plan.days.map((day) =>
      el('section', { class: 'card day-card' }, [
        el('h4', {}, `Day ${day.index} — ${day.title}`),
        el('p', { class: 'muted small' }, `about ${day.hours}h of unhurried sightseeing`),
        el('ol', { class: 'day-items' }, day.items.map((item) => dayItem(item, plan.destination))),
        eveningBlock(day.evening, plan.context.month),
      ])
    )
  );
}

/** The per-person cost estimate, itemized and honest. */
export function renderTripEstimate(container, plan) {
  const { estimate, context } = plan;
  fill(container, [
    el('div', { class: 'card estimate' }, [
      el('h4', {}, 'What this trip costs, roughly'),
      el('dl', {}, [
        el('dt', {}, `${context.days} day(s) of stay, food & local transport (${context.budget})`),
        el('dd', {}, rupees(estimate.base)),
        el('dt', {}, 'Entry tickets on the plan'),
        el('dd', {}, rupees(estimate.entries)),
        el('dt', {}, 'Cultural experiences on the plan'),
        el('dd', {}, rupees(estimate.experiences)),
        el('dt', { class: 'total' }, 'Per person, all in'),
        el('dd', { class: 'total' }, `≈ ${rupees(estimate.total)}`),
      ]),
      el('p', { class: 'muted small' }, 'Typical estimates for planning, not live prices.'),
    ]),
  ]);
}

/** Honest footnotes: what was skipped, what didn't fit, spare days. */
export function renderTripNotes(container, plan) {
  fill(
    container,
    plan.notes.length > 0
      ? [el('ul', { class: 'notes' }, plan.notes.map((n) => el('li', {}, n)))]
      : []
  );
}
