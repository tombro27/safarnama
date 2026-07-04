/**
 * Local events — matching a destination's festival calendar to the
 * traveler's month. Festivals in the catalog carry their *typical* months
 * (many follow lunar calendars and drift), so matches are always presented
 * with a "check exact dates" honesty note by the UI.
 */

import { MONTH_NAMES } from './context.js';

/** @param {number} month 1..12 */
export function monthName(month) {
  return MONTH_NAMES[month - 1];
}

/**
 * Festivals at this destination that usually fall in the given month.
 *
 * @param {{festivals: Array}} destination
 * @param {number} month 1..12
 * @returns {Array} catalog festival entries
 */
export function festivalsIn(destination, month) {
  return destination.festivals.filter((f) => f.months.includes(month));
}

/**
 * The soonest festival at or after the given month (cyclic year) — powers
 * the honest "nothing this month, but come back in November for…" line.
 *
 * @param {{festivals: Array}} destination
 * @param {number} month 1..12
 * @returns {{festival: object, month: number, wait: number} | null}
 *   wait = whole months until it comes around (0 = this month)
 */
export function nextFestival(destination, month) {
  let best = null;
  for (const festival of destination.festivals) {
    for (const m of festival.months) {
      const wait = (m - month + 12) % 12;
      const sooner =
        !best ||
        wait < best.wait ||
        (wait === best.wait && festival.name.localeCompare(best.festival.name) < 0);
      if (sooner) best = { festival, month: m, wait };
    }
  }
  return best;
}
