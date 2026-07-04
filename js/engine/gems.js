/**
 * Hidden-gem discovery.
 *
 * A gem is a place with high cultural reward and little footfall. The
 * thresholds are explicit and testable rather than vibes: quiet enough
 * (popularity ≤ 0.4 on an all-India scale) AND culturally rich enough
 * (cultural value ≥ 0.7). Gems the user physically can't do (mobility)
 * are flagged, never silently hidden — discovery should inform, the
 * itinerary is what enforces constraints.
 */

import { interestLabels } from './context.js';
import { matchedInterests } from './score.js';

export const GEM_MAX_POPULARITY = 0.4;
export const GEM_MIN_CULTURAL_VALUE = 0.7;

/** @param {{popularity: number, culturalValue: number}} attraction */
export function isHiddenGem(attraction) {
  return (
    attraction.popularity <= GEM_MAX_POPULARITY &&
    attraction.culturalValue >= GEM_MIN_CULTURAL_VALUE
  );
}

/** Cultural reward per unit of crowd — what makes a gem a gem. */
function gemScore(attraction) {
  return attraction.culturalValue * (1 - attraction.popularity);
}

function gemReasons(attraction, matched, ctx) {
  const reasons = [];
  reasons.push(
    `Cultural value ${Math.round(attraction.culturalValue * 10)}/10 with a fraction of the usual footfall`
  );
  if (matched.length > 0) {
    reasons.push(`Speaks to your interest in ${interestLabels(matched)}`);
  }
  if (ctx.mobility && !attraction.mobilityFriendly) {
    reasons.push('Heads-up: involves steps or uneven ground');
  }
  return reasons;
}

/**
 * The destination's hidden gems, ranked for this traveler: gems serving
 * their interests first, then by gem score. Deterministic ties on name.
 *
 * @param {{attractions: Array}} destination
 * @param {object} ctx normalized traveler context
 * @returns {Array<{attraction: object, matched: string[], score: number,
 *   accessible: boolean, reasons: string[]}>}
 */
export function hiddenGems(destination, ctx) {
  return destination.attractions
    .filter(isHiddenGem)
    .map((attraction) => {
      const matched = matchedInterests(attraction.interests, ctx.interests);
      return {
        attraction,
        matched,
        score: gemScore(attraction),
        accessible: !ctx.mobility || attraction.mobilityFriendly,
        reasons: gemReasons(attraction, matched, ctx),
      };
    })
    .sort(
      (a, b) =>
        (b.matched.length > 0) - (a.matched.length > 0) ||
        b.score - a.score ||
        a.attraction.name.localeCompare(b.attraction.name)
    );
}
