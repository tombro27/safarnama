/**
 * GenAI feature 1 — free-text trip parsing.
 *
 * Turns "two of us, five days in November, mad about old forts and street
 * food, allergic to crowds, mid-range budget" into the same structured
 * context the form produces. The response is schema-constrained here AND
 * passed through normalizeContext() by the caller — defense in depth.
 */

import { generateJson } from './client.js';
import {
  INTEREST_KEYS, PACES, BUDGET_TIERS, CROWD_PREFS, PARTIES, REGIONS,
  DAYS_MIN, DAYS_MAX,
} from '../engine/context.js';

/** Structured output contract the model must follow. */
const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    month: { type: 'INTEGER' },
    days: { type: 'INTEGER' },
    interests: { type: 'ARRAY', items: { type: 'STRING', enum: INTEREST_KEYS } },
    pace: { type: 'STRING', enum: PACES },
    budget: { type: 'STRING', enum: BUDGET_TIERS },
    crowd: { type: 'STRING', enum: CROWD_PREFS },
    party: { type: 'STRING', enum: PARTIES },
    region: { type: 'STRING', enum: REGIONS },
    mobility: { type: 'BOOLEAN' },
  },
  required: ['month', 'days', 'interests', 'pace', 'budget', 'crowd', 'party', 'region', 'mobility'],
};

const SYSTEM_PROMPT = [
  'Extract travel-planning context from the user\'s description of the trip they want in India.',
  'month: calendar month of travel, 1-12. Default 11 (November) if unstated.',
  `days: trip length in days, ${DAYS_MIN}-${DAYS_MAX}. Default 4 if unstated.`,
  'interests: only what the user actually signals. history = monuments/forts/past;',
  'architecture = buildings/design; food = eating/cuisine/street food; crafts = handicrafts/',
  'textiles/artisans; spiritual = temples/rituals/pilgrimage; performing = music/dance/theatre;',
  'nature = landscapes/outdoors; folk = village life/markets/everyday local culture.',
  'pace: packed = wants to see a lot, relaxed = slow travel, else balanced.',
  'budget: shoestring = cheap/backpacker, premium = luxury/no expense spared, else comfortable.',
  'crowd: avoid = dislikes crowds/touristy places, buzz = loves lively famous places, else mixed.',
  'party: solo | couple (2 people/partner) | family (with kids/parents) | friends (group).',
  'region of India: only when the user names one (north/south/east/west/central/northeast), else any.',
  'mobility: true only if someone in the group needs step-free access / has limited mobility.',
].join('\n');

/**
 * @param {string} text  the user's free-text trip description
 * @param {string} apiKey Gemini API key (kept in memory/session only)
 * @returns {Promise<object>} raw context fields, ready for normalizeContext()
 * @throws {Error} descriptive error when the call fails — callers show it as-is
 */
export function parseTripDescription(text, apiKey) {
  return generateJson({
    apiKey,
    system: SYSTEM_PROMPT,
    user: text,
    schema: RESPONSE_SCHEMA,
  });
}
