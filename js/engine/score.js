/**
 * Shared scoring primitives.
 *
 * Every score in the app is a 0..1 number produced here or composed from
 * these, so the semantics live in one place: what "fits your crowd
 * preference" or "serves your interests" means is defined once and reused
 * by the matcher, the itinerary builder, gems and experiences alike.
 */

/**
 * How well a place's tourist traffic sits with the user's crowd preference.
 * Crowd-averse users reward quiet places linearly; buzz-seekers reward
 * lively ones (with a floor, since even they don't pick places *for*
 * emptiness); 'mixed' is a flat neutral so crowds neither attract nor repel.
 *
 * @param {number} popularity 0..1 (1 = Taj-Mahal-level footfall)
 * @param {'avoid'|'mixed'|'buzz'} crowd
 * @returns {number} 0..1
 */
export function crowdFit(popularity, crowd) {
  if (crowd === 'avoid') return 1 - popularity;
  if (crowd === 'buzz') return 0.4 + 0.6 * popularity;
  return 0.7;
}

/**
 * How strongly a destination serves the user's chosen interests.
 * Mostly the average across their interests, with a bonus for the single
 * strongest match — a city that is world-class at one thing you love
 * beats one that is lukewarm at everything.
 *
 * @param {Record<string, number>} affinities destination interest map (0..1 each)
 * @param {string[]} userInterests normalized interest keys (never empty)
 * @returns {number} 0..1
 */
export function destinationAffinity(affinities, userInterests) {
  const values = userInterests.map((key) => affinities[key] ?? 0);
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const peak = Math.max(...values);
  return 0.7 * mean + 0.3 * peak;
}

/**
 * The user's interests that a place (attraction/experience) actually serves.
 *
 * @param {string[]} interests the place's interest tags
 * @param {string[]} userInterests
 * @returns {string[]} intersection, in the user's priority order
 */
export function matchedInterests(interests, userInterests) {
  return userInterests.filter((key) => interests.includes(key));
}

/**
 * Interest fit of a single place: 1 when the place is entirely about
 * something the user loves, tapering as its focus spreads across tags the
 * user didn't pick; a small floor keeps unmatched places rankable rather
 * than invisible (a great monument is still worth a slot on a quiet day).
 *
 * @param {string[]} interests the place's interest tags (never empty)
 * @param {string[]} userInterests
 * @returns {number} 0..1
 */
export function interestFit(interests, userInterests) {
  const hits = matchedInterests(interests, userInterests).length;
  if (hits === 0) return 0.2;
  return 0.5 + 0.5 * (hits / Math.min(interests.length, userInterests.length));
}
