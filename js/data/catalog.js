/**
 * The destination catalog — access layer and shared shape documentation.
 *
 * Data is curated by hand (with AI assistance) and fact-checked; numbers
 * like popularity, cultural value and costs are honest typical estimates,
 * not live feeds — the app says so in its footer. One file per
 * destination keeps entries reviewable; this module is the only place
 * that binds them together.
 *
 * @typedef {object} Attraction
 * @property {string} id snake_case, unique within the catalog
 * @property {string} name
 * @property {'monument'|'temple'|'museum'|'market'|'neighbourhood'|'nature'|'food'|'craft'} kind
 * @property {string} zone kebab-case cluster label; same-zone places share a day
 * @property {string[]} interests interest keys this place serves (1-3)
 * @property {number} popularity 0..1 on an all-India tourism scale
 * @property {number} culturalValue 0..1 cultural reward of the visit
 * @property {number} hours time a visit needs (0.5 steps)
 * @property {number} entryCost typical Indian-national ticket, ₹ (0 = free)
 * @property {boolean} mobilityFriendly realistic step-free access
 * @property {'morning'|'afternoon'|'evening'|'any'} bestTime
 * @property {string} story hand-written 2-3 sentence story (offline story mode)
 * @property {string[]} facts verifiable facts that ground AI storytelling
 *
 * @typedef {object} Experience
 * @property {string} id
 * @property {string} name
 * @property {'workshop'|'food'|'performance'|'stay'|'walk'|'ritual'} kind
 * @property {string[]} interests
 * @property {string[]} party which traveler parties it suits
 * @property {number} cost ₹ per person
 * @property {number} hours
 * @property {string} description
 * @property {string} etiquette one practical respectful-visitor tip
 * @property {string} supportsLocals whom the money sustains
 *
 * @typedef {object} Festival
 * @property {string} id
 * @property {string} name
 * @property {number[]} months typical calendar months (lunar dates drift)
 * @property {string} description
 * @property {string} whyGo what a visitor actually witnesses
 * @property {string} etiquette one respectful-participation tip
 *
 * @typedef {object} Destination
 * @property {string} id
 * @property {string} name
 * @property {string} state
 * @property {'north'|'south'|'east'|'west'|'central'|'northeast'} region
 * @property {string} tagline
 * @property {Record<string, number>} interests affinity 0..1 per interest key
 * @property {number} popularity 0..1
 * @property {number[]} bestMonths climate-comfortable months
 * @property {{shoestring: number, comfortable: number, premium: number}} costPerDay
 *   ₹ per person per day, all-in (stay + food + local transport)
 * @property {string} heritage 2-3 sentence heritage summary
 * @property {Attraction[]} attractions
 * @property {Experience[]} experiences
 * @property {Festival[]} festivals
 */

import ahmedabad from './destinations/ahmedabad.js';
import amritsar from './destinations/amritsar.js';
import bhuj from './destinations/bhuj.js';
import hampi from './destinations/hampi.js';
import jaipur from './destinations/jaipur.js';
import kochi from './destinations/kochi.js';
import kolkata from './destinations/kolkata.js';
import madurai from './destinations/madurai.js';
import majuli from './destinations/majuli.js';
import orchha from './destinations/orchha.js';
import puri from './destinations/puri.js';
import varanasi from './destinations/varanasi.js';

/** @type {Destination[]} alphabetical; ranking order is decided by scores. */
export const DESTINATIONS = [
  ahmedabad, amritsar, bhuj, hampi, jaipur, kochi,
  kolkata, madurai, majuli, orchha, puri, varanasi,
];

const BY_ID = new Map(DESTINATIONS.map((d) => [d.id, d]));

/**
 * @param {string} id
 * @returns {Destination | undefined}
 */
export function destinationById(id) {
  return BY_ID.get(id);
}
