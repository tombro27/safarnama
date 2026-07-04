/**
 * Authentic cultural experiences — the "connect with local culture" layer.
 *
 * Matching is deliberately conservative: experiences are filtered to the
 * traveler's party (a rowdy group changes what's appropriate at a satra
 * prayer), ranked by interest fit, and priced against the budget tier —
 * above-tier ones are *flagged* as a splurge rather than hidden, because
 * a once-in-a-lifetime workshop can be worth breaking budget for. Every
 * result carries its etiquette note and how paying for it sustains the
 * craft or community.
 */

import { interestLabels } from './context.js';
import { matchedInterests } from './score.js';

/** Per-person spend that stops feeling routine for each budget tier (₹). */
export const SPLURGE_ABOVE = { shoestring: 800, comfortable: 2500, premium: Infinity };

function experienceReasons(entry, ctx) {
  const reasons = [];
  if (entry.matched.length > 0) {
    reasons.push(
      `Hands-on with ${interestLabels(entry.matched)}`
    );
  }
  reasons.push(
    entry.experience.cost === 0
      ? 'Free to join'
      : `≈ ₹${entry.experience.cost} per person, about ${entry.experience.hours}h`
  );
  if (entry.splurge) {
    reasons.push(`A splurge on a ${ctx.budget} budget — flagged, not hidden, in case it's worth it to you`);
  }
  return reasons;
}

/**
 * Rank the destination's experiences for this traveler.
 * If none fit the party (unusual, but possible), the filter is relaxed
 * and the result says so — an empty section teaches the user nothing.
 *
 * @param {{experiences: Array}} destination
 * @param {object} ctx normalized traveler context
 * @returns {{matches: Array<{experience: object, matched: string[],
 *   splurge: boolean, reasons: string[]}>, partyRelaxed: boolean}}
 */
export function matchExperiences(destination, ctx) {
  let pool = destination.experiences.filter((e) => e.party.includes(ctx.party));
  const partyRelaxed = pool.length === 0;
  if (partyRelaxed) pool = destination.experiences;

  const matches = pool
    .map((experience) => {
      const matched = matchedInterests(experience.interests, ctx.interests);
      const entry = {
        experience,
        matched,
        splurge: experience.cost > SPLURGE_ABOVE[ctx.budget],
      };
      entry.reasons = experienceReasons(entry, ctx);
      return entry;
    })
    .sort(
      (a, b) =>
        b.matched.length - a.matched.length ||
        a.splurge - b.splurge ||
        a.experience.cost - b.experience.cost ||
        a.experience.name.localeCompare(b.experience.name)
    );

  return { matches, partyRelaxed };
}
