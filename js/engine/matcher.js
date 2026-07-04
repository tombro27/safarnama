/**
 * Destination matcher — the first decision core.
 *
 * Every destination in the catalog is scored for THIS traveler:
 *   1. interest affinity — how strongly the place serves what they love,
 *   2. season fit — honest about monsoon and heat, never hides it,
 *   3. crowd fit — quiet places for the crowd-averse, buzz for buzz-lovers,
 *   4. festival luck — a matching festival in their month is a real bonus,
 *   5. cost fit — relative affordability within their budget tier.
 * Weights shift with the traveler (crowd preference, shoestring budgets),
 * every pick ships with human-readable reasons, and ties break
 * deterministically — same inputs, same ranking, fully inspectable.
 */

import { DESTINATIONS } from '../data/catalog.js';
import { normalizeContext, INTERESTS, MONTH_NAMES } from './context.js';
import { crowdFit, destinationAffinity } from './score.js';
import { festivalsIn, monthName } from './events.js';

/** How many ranked destinations the UI presents (top pick + alternatives). */
export const SHORTLIST_SIZE = 3;

export const SEASONS = ['peak', 'shoulder', 'off'];
const SEASON_SCORE = { peak: 1, shoulder: 0.6, off: 0.25 };

/**
 * Scoring weights by crowd preference. The crowd-averse trade festival
 * chasing for quiet; buzz-seekers do the opposite. On a shoestring budget
 * the cost weight grows at the festival weight's expense — price
 * differences bite hardest there.
 */
const WEIGHTS = {
  mixed: { affinity: 0.40, season: 0.25, crowd: 0.10, festival: 0.15, cost: 0.10 },
  avoid: { affinity: 0.35, season: 0.20, crowd: 0.25, festival: 0.10, cost: 0.10 },
  buzz:  { affinity: 0.35, season: 0.20, crowd: 0.15, festival: 0.20, cost: 0.10 },
};
const SHOESTRING_COST_SHIFT = 0.05;

function weightsFor(ctx) {
  const base = { ...WEIGHTS[ctx.crowd] };
  if (ctx.budget === 'shoestring') {
    base.cost += SHOESTRING_COST_SHIFT;
    base.festival -= SHOESTRING_COST_SHIFT;
  }
  return base;
}

/** Cyclic month distance (Dec → Jan is 1 month apart, not 11). */
function monthGap(a, b) {
  const diff = Math.abs(a - b);
  return Math.min(diff, 12 - diff);
}

/**
 * @param {{bestMonths: number[]}} destination
 * @param {number} month 1..12
 * @returns {'peak'|'shoulder'|'off'}
 */
export function seasonFor(destination, month) {
  if (destination.bestMonths.includes(month)) return 'peak';
  const nearBest = destination.bestMonths.some((m) => monthGap(m, month) === 1);
  return nearBest ? 'shoulder' : 'off';
}

/**
 * Render months as compact cyclic ranges: [10,11,12,1,2] → "October–February".
 *
 * @param {number[]} months 1..12, any order
 * @returns {string}
 */
export function formatMonths(months) {
  const sorted = [...new Set(months)].sort((a, b) => a - b);
  if (sorted.length === 12) return 'all year';

  // Group consecutive months, then merge a December-run into a January-run.
  const runs = [];
  for (const m of sorted) {
    const last = runs[runs.length - 1];
    if (last && m === last[last.length - 1] + 1) last.push(m);
    else runs.push([m]);
  }
  const first = runs[0];
  const last = runs[runs.length - 1];
  if (runs.length > 1 && first[0] === 1 && last[last.length - 1] === 12) {
    runs.shift();
    last.push(...first);
  }
  return runs
    .map((run) =>
      run.length === 1
        ? MONTH_NAMES[run[0] - 1]
        : `${MONTH_NAMES[run[0] - 1]}–${MONTH_NAMES[run[run.length - 1] - 1]}`
    )
    .join(', ');
}

/** Relative affordability of a destination within its tier, across the pool. */
function costScore(destination, pool, tier) {
  const costs = pool.map((d) => d.costPerDay[tier]);
  const min = Math.min(...costs);
  const max = Math.max(...costs);
  if (max === min) return 1;
  return 1 - (destination.costPerDay[tier] - min) / (max - min);
}

function affinityReason(destination, ctx) {
  const strong = ctx.interests
    .filter((key) => destination.interests[key] >= 0.7)
    .sort((a, b) => destination.interests[b] - destination.interests[a])
    .slice(0, 2)
    .map((key) => INTERESTS[key].toLowerCase());
  if (strong.length > 0) return `Among India's strongest places for ${strong.join(' and ')}`;
  const peak = Math.max(...ctx.interests.map((key) => destination.interests[key] ?? 0));
  return peak >= 0.5
    ? 'Solid ground for your mix of interests'
    : 'A stretch for your chosen interests — ranked lower for it';
}

function seasonReason(destination, season, ctx) {
  const best = formatMonths(destination.bestMonths);
  if (season === 'peak') return `${monthName(ctx.month)} is prime season (at its best ${best})`;
  if (season === 'shoulder') return `${monthName(ctx.month)} is shoulder season — the sweet spot is ${best}`;
  return `Honestly off-season in ${monthName(ctx.month)} (best ${best}) — expect heat or rain`;
}

function crowdReason(destination, ctx) {
  if (ctx.crowd === 'avoid' && destination.popularity <= 0.4) return 'Well off the mainstream tourist trail';
  if (ctx.crowd === 'avoid' && destination.popularity >= 0.7) return 'Heavily visited — the plan will lean on early mornings and quieter corners';
  if (ctx.crowd === 'buzz' && destination.popularity >= 0.7) return 'Big, busy and alive — exactly the buzz you asked for';
  return null;
}

function buildReasons(destination, ctx, season, festivals) {
  const reasons = [affinityReason(destination, ctx), seasonReason(destination, season, ctx)];
  for (const festival of festivals.slice(0, 2)) {
    reasons.push(`${festival.name} usually falls in ${monthName(ctx.month)} — a rare chance (check exact dates)`);
  }
  const crowd = crowdReason(destination, ctx);
  if (crowd) reasons.push(crowd);
  reasons.push(
    `≈ ₹${destination.costPerDay[ctx.budget]}/day per person on a ${ctx.budget} budget (stay + food + local transport)`
  );
  return reasons;
}

/**
 * Rank every catalog destination for this traveler.
 *
 * @param {object} rawContext values straight from the form (or the AI parser)
 * @returns {{context: object, ranked: Array<{destination: object,
 *   score: number, season: string, festivals: Array, reasons: string[]}>,
 *   regionRelaxed: boolean}}
 */
export function rankDestinations(rawContext) {
  const ctx = normalizeContext(rawContext);
  const weights = weightsFor(ctx);

  let pool = ctx.region === 'any'
    ? DESTINATIONS
    : DESTINATIONS.filter((d) => d.region === ctx.region);
  const regionRelaxed = pool.length === 0;
  if (regionRelaxed) pool = DESTINATIONS;

  const ranked = pool
    .map((destination) => {
      const season = seasonFor(destination, ctx.month);
      const festivals = festivalsIn(destination, ctx.month);
      const score =
        weights.affinity * destinationAffinity(destination.interests, ctx.interests) +
        weights.season * SEASON_SCORE[season] +
        weights.crowd * crowdFit(destination.popularity, ctx.crowd) +
        weights.festival * (festivals.length > 0 ? 1 : 0) +
        weights.cost * costScore(destination, pool, ctx.budget);
      return {
        destination,
        score,
        season,
        festivals,
        reasons: buildReasons(destination, ctx, season, festivals),
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.destination.costPerDay[ctx.budget] - b.destination.costPerDay[ctx.budget] ||
        a.destination.name.localeCompare(b.destination.name)
    );

  return { context: ctx, ranked, regionRelaxed };
}
