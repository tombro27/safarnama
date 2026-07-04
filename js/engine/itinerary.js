/**
 * Itinerary builder — the second decision core.
 *
 * Turns a chosen destination + traveler context into a day-by-day cultural
 * plan:
 *   1. score every attraction for THIS traveler (interest fit, cultural
 *      value, crowd fit) and honor a hard mobility constraint,
 *   2. always keep the destination's signature sight — crowd-averse
 *      travelers get it at opening time, not deleted from their trip,
 *   3. cluster the picks into days by zone so a day flows through one
 *      part of town instead of criss-crossing it,
 *   4. give every evening a cultural program: a festival when the month
 *      grants one, an authentic experience otherwise,
 *   5. estimate the real per-person cost and say what didn't fit.
 * Deterministic throughout: same inputs, same trip.
 */

import { normalizeContext, interestLabels } from './context.js';
import { crowdFit, interestFit, matchedInterests } from './score.js';
import { isHiddenGem } from './gems.js';
import { festivalsIn } from './events.js';
import { matchExperiences } from './experiences.js';

/** Daytime attraction slots by pace; evenings are planned separately. */
export const SLOTS_PER_DAY = { relaxed: 2, balanced: 3, packed: 4 };
/** Rough sightseeing-hour ceiling per day, so slots stay humane. */
const DAY_HOURS = { relaxed: 5, balanced: 7, packed: 9 };
/** Popularity at which a sight counts as the destination's signature. */
const ANCHOR_MIN_POPULARITY = 0.75;

const ATTRACTION_WEIGHTS = { interest: 0.45, cultural: 0.30, crowd: 0.25 };
const BEST_TIME_ORDER = { morning: 0, any: 1, afternoon: 2, evening: 3 };

// Attraction scores are read inside sort comparators (many times per
// attraction); memoize per normalized context so each is computed once. The
// context object is fresh per buildItinerary() call, so the cache clears
// with it — no cross-call staleness.
const scoreCache = new WeakMap();

function scoreAttraction(attraction, ctx) {
  let perCtx = scoreCache.get(ctx);
  if (!perCtx) {
    perCtx = new Map();
    scoreCache.set(ctx, perCtx);
  }
  const cached = perCtx.get(attraction);
  if (cached !== undefined) return cached;
  const score =
    ATTRACTION_WEIGHTS.interest * interestFit(attraction.interests, ctx.interests) +
    ATTRACTION_WEIGHTS.cultural * attraction.culturalValue +
    ATTRACTION_WEIGHTS.crowd * crowdFit(attraction.popularity, ctx.crowd);
  perCtx.set(attraction, score);
  return score;
}

/** 'old-city' → 'Old City' for day titles. */
function prettyZone(zone) {
  return zone
    .split('-')
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Pick which attractions make the trip: the signature sight plus the
 * best-scoring rest, within days × slots capacity. Mobility is a hard
 * filter here (the plan must be walkable for the traveler), with the
 * exclusions reported, never silent.
 */
function selectAttractions(destination, ctx) {
  const pool = ctx.mobility
    ? destination.attractions.filter((a) => a.mobilityFriendly)
    : destination.attractions;
  const excluded = ctx.mobility
    ? destination.attractions.filter((a) => !a.mobilityFriendly).map((a) => a.name)
    : [];

  const anchor = pool
    .filter((a) => a.popularity >= ANCHOR_MIN_POPULARITY)
    .sort((a, b) => b.culturalValue - a.culturalValue || a.name.localeCompare(b.name))[0] ?? null;

  const capacity = ctx.days * SLOTS_PER_DAY[ctx.pace];
  const ranked = pool
    .filter((a) => a !== anchor)
    .sort(
      (a, b) =>
        scoreAttraction(b, ctx) - scoreAttraction(a, ctx) ||
        b.culturalValue - a.culturalValue ||
        a.name.localeCompare(b.name)
    );

  const chosen = anchor ? [anchor, ...ranked] : ranked;
  return { chosen: chosen.slice(0, capacity), overflow: chosen.slice(capacity), anchor, excluded };
}

/**
 * Group chosen attractions by zone and deal zones out into days: the
 * anchor's zone opens the trip, larger zones follow, and a day closes
 * when its slots or its humane hour-budget fill up.
 */
function clusterIntoDays(chosen, anchor, ctx) {
  const groups = new Map();
  for (const attraction of chosen) {
    if (!groups.has(attraction.zone)) groups.set(attraction.zone, []);
    groups.get(attraction.zone).push(attraction);
  }

  const zoneHours = (zone) => groups.get(zone).reduce((sum, a) => sum + a.hours, 0);
  const zones = [...groups.keys()].sort((a, b) => {
    if (a === anchor?.zone) return -1;
    if (b === anchor?.zone) return 1;
    return zoneHours(b) - zoneHours(a) || a.localeCompare(b);
  });

  const inDayOrder = (a, b) =>
    (b === anchor) - (a === anchor) ||
    BEST_TIME_ORDER[a.bestTime] - BEST_TIME_ORDER[b.bestTime] ||
    scoreAttraction(b, ctx) - scoreAttraction(a, ctx) ||
    a.name.localeCompare(b.name);

  const slots = SLOTS_PER_DAY[ctx.pace];
  const days = [];
  const spillover = [];
  let current = null;

  const closeDay = () => {
    if (current) days.push(current);
    current = null;
  };

  for (const zone of zones) {
    for (const attraction of groups.get(zone).sort(inDayOrder)) {
      const dayFull =
        current &&
        (current.attractions.length >= slots ||
          current.hours + attraction.hours > DAY_HOURS[ctx.pace]);
      if (dayFull) closeDay();
      if (!current) {
        if (days.length >= ctx.days) {
          spillover.push(attraction);
          continue;
        }
        current = { attractions: [], zones: [], hours: 0 };
      }
      current.attractions.push(attraction);
      current.hours += attraction.hours;
      if (!current.zones.includes(zone)) current.zones.push(zone);
    }
  }
  closeDay();
  return { days, spillover };
}

function whyThisAttraction(attraction, anchor, ctx) {
  const why = [];
  if (attraction === anchor) {
    // Crowd-averse travellers keep the signature sight, timed to dodge the
    // crush — at opening time, unless the place is genuinely best later.
    const beatCrowds =
      attraction.bestTime === 'morning' || attraction.bestTime === 'any'
        ? 'go right at opening, before the crowds'
        : `go in the ${attraction.bestTime}, its best hour, and skirt the day-trip crush`;
    why.push(
      ctx.crowd === 'avoid'
        ? `The signature sight — kept in your trip, with a plan to ${beatCrowds}`
        : 'The signature sight of this destination'
    );
  }
  if (isHiddenGem(attraction)) {
    why.push('A hidden gem — rich culture, little footfall');
  }
  const matched = matchedInterests(attraction.interests, ctx.interests);
  if (matched.length > 0) {
    why.push(`For your love of ${interestLabels(matched)}`);
  }
  if (attraction.bestTime !== 'any') {
    why.push(`At its best in the ${attraction.bestTime}`);
  }
  return why;
}

/**
 * Plan evenings: festivals claim the first evenings (they're the reason to
 * be here THIS month), then experiences fill the rest — in-budget ones in
 * interest-match order first, and above-budget "splurge" experiences only
 * once nothing within budget is left to schedule. Splurges are never hidden
 * (the discovery list still shows them, flagged); we just don't quietly
 * bill one into your itinerary while a cheaper option was available.
 */
function planEvenings(destination, ctx) {
  const evenings = festivalsIn(destination, ctx.month).map((festival) => ({ type: 'festival', festival }));

  const { matches } = matchExperiences(destination, ctx);
  const withinBudget = matches.filter((entry) => !entry.splurge);
  const splurges = matches.filter((entry) => entry.splurge);
  for (const entry of [...withinBudget, ...splurges]) {
    evenings.push({ type: 'experience', entry });
  }
  return evenings.slice(0, ctx.days);
}

function estimateCost(destination, ctx, dayPlans, evenings) {
  const entries = dayPlans
    .flatMap((day) => day.attractions)
    .reduce((sum, a) => sum + a.entryCost, 0);
  const experiences = evenings
    .filter((e) => e.type === 'experience')
    .reduce((sum, e) => sum + e.entry.experience.cost, 0);
  const base = ctx.days * destination.costPerDay[ctx.budget];
  return { base, entries, experiences, total: base + entries + experiences };
}

function buildNotes(ctx, selection, spillover, dayPlans) {
  const notes = [];
  if (selection.excluded.length > 0) {
    notes.push(
      `Skipped for step-free access: ${selection.excluded.join(', ')} — the rest of the plan needs no stairs or rough ground.`
    );
  }
  const leftOut = [...spillover, ...selection.overflow];
  if (leftOut.length > 0) {
    notes.push(
      `Didn't fit your ${ctx.days} day(s): ${leftOut.slice(0, 4).map((a) => a.name).join(', ')} — reasons to come back.`
    );
  }
  if (dayPlans.length < ctx.days) {
    notes.push(
      `${ctx.days - dayPlans.length} day(s) left deliberately open — wander, revisit a favourite, or simply sit where the locals sit.`
    );
  }
  return notes;
}

/**
 * Build the full day-by-day plan.
 *
 * @param {object} destination a catalog destination entry
 * @param {object} rawContext values straight from the form (or the AI parser)
 * @returns {{context: object, destination: object,
 *   days: Array<{index: number, title: string, hours: number,
 *     items: Array<{attraction: object, why: string[], gem: boolean, anchor: boolean}>,
 *     evening: object|null}>,
 *   estimate: {base: number, entries: number, experiences: number, total: number},
 *   notes: string[]}}
 */
export function buildItinerary(destination, rawContext) {
  const ctx = normalizeContext(rawContext);
  const selection = selectAttractions(destination, ctx);
  const { days: dayPlans, spillover } = clusterIntoDays(selection.chosen, selection.anchor, ctx);
  // Only program (and cost) evenings for days that actually get built — a
  // trip can end up shorter than requested when the catalog runs out, and a
  // billed-but-unshown evening would make the estimate lie.
  const evenings = planEvenings(destination, ctx).slice(0, dayPlans.length);

  const days = dayPlans.map((day, i) => ({
    index: i + 1,
    title: day.zones.map(prettyZone).join(' & '),
    hours: day.hours,
    items: day.attractions.map((attraction) => ({
      attraction,
      why: whyThisAttraction(attraction, selection.anchor, ctx),
      gem: isHiddenGem(attraction),
      anchor: attraction === selection.anchor,
    })),
    evening: evenings[i] ?? null,
  }));

  return {
    context: ctx,
    destination,
    days,
    estimate: estimateCost(destination, ctx, dayPlans, evenings),
    notes: buildNotes(ctx, selection, spillover, dayPlans),
  };
}
