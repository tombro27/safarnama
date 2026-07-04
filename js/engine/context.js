/**
 * Traveler-context normalization.
 *
 * Everything downstream (destination matcher, itinerary builder, gems,
 * festivals, experiences) consumes the normalized context produced here,
 * so all input validation and defaults live in one place. Hostile or
 * accidental input — junk numbers, unknown ids, wrong types — is clamped
 * or dropped before it can distort a recommendation.
 */

/** Interest keys shared by the whole app (forms, catalog, engine). */
export const INTERESTS = {
  history: 'History & monuments',
  architecture: 'Architecture & design',
  food: 'Food & culinary traditions',
  crafts: 'Crafts & handlooms',
  spiritual: 'Sacred & spiritual places',
  performing: 'Music, dance & performance',
  nature: 'Nature & landscapes',
  folk: 'Folk life & local ways',
};
export const INTEREST_KEYS = Object.keys(INTERESTS);

export const PACES = ['relaxed', 'balanced', 'packed'];
export const BUDGET_TIERS = ['shoestring', 'comfortable', 'premium'];
export const CROWD_PREFS = ['avoid', 'mixed', 'buzz'];
export const PARTIES = ['solo', 'couple', 'family', 'friends'];
export const REGIONS = ['any', 'north', 'south', 'east', 'west', 'central', 'northeast'];

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Trip length the planner accepts, in days. */
export const DAYS_MIN = 1;
export const DAYS_MAX = 14;

/** When the user picks no interests, plan a rounded first encounter. */
const DEFAULT_INTERESTS = ['history', 'food', 'folk'];
const DEFAULT_MONTH = 11; // November — peak season across most of India
const DEFAULT_DAYS = 4;

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

/** Coerce to a finite number, falling back when the input is junk. */
function toNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Keep only known enum values, falling back when the input is junk. */
function pick(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

/**
 * Normalize raw form (or AI-parsed) values into a safe, complete context.
 *
 * @param {object} raw
 * @returns {{
 *   month: number, days: number, interests: string[], pace: string,
 *   budget: string, crowd: string, party: string, region: string,
 *   mobility: boolean
 * }}
 */
export function normalizeContext(raw = {}) {
  const month = clamp(Math.round(toNumber(raw.month, DEFAULT_MONTH)), 1, 12);
  const days = clamp(Math.round(toNumber(raw.days, DEFAULT_DAYS)), DAYS_MIN, DAYS_MAX);

  const requested = Array.isArray(raw.interests) ? raw.interests : [];
  let interests = [...new Set(requested.filter((k) => INTEREST_KEYS.includes(k)))];
  if (interests.length === 0) interests = [...DEFAULT_INTERESTS];

  return {
    month,
    days,
    interests,
    pace: pick(raw.pace, PACES, 'balanced'),
    budget: pick(raw.budget, BUDGET_TIERS, 'comfortable'),
    crowd: pick(raw.crowd, CROWD_PREFS, 'mixed'),
    party: pick(raw.party, PARTIES, 'couple'),
    region: pick(raw.region, REGIONS, 'any'),
    mobility: raw.mobility === true || raw.mobility === 'true',
  };
}
