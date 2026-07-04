import { test } from 'node:test';
import assert from 'node:assert/strict';
import { festivalsIn, nextFestival, monthName } from '../js/engine/events.js';

const dest = {
  festivals: [
    { id: 'a', name: 'Aarti Utsav', months: [11], description: '', whyGo: '', etiquette: '' },
    { id: 'b', name: 'Basant Mela', months: [1, 2], description: '', whyGo: '', etiquette: '' },
  ],
};

test('festivalsIn returns only the month’s festivals', () => {
  assert.deepEqual(festivalsIn(dest, 11).map((f) => f.id), ['a']);
  assert.deepEqual(festivalsIn(dest, 2).map((f) => f.id), ['b']);
  assert.deepEqual(festivalsIn(dest, 6), []);
});

test('nextFestival counts the wait cyclically across New Year', () => {
  const fromNov = nextFestival(dest, 11);
  assert.equal(fromNov.wait, 0, 'a festival this month means no wait');
  const fromDec = nextFestival(dest, 12);
  assert.equal(fromDec.festival.id, 'b');
  assert.equal(fromDec.wait, 1, 'December → January is one month, not eleven');
});

test('nextFestival is deterministic on ties and null when no festivals exist', () => {
  const tied = {
    festivals: [
      { id: 'z', name: 'Zesty Fair', months: [3] },
      { id: 'm', name: 'Mango Fair', months: [3] },
    ],
  };
  assert.equal(nextFestival(tied, 3).festival.id, 'm', 'alphabetical tie-break');
  assert.equal(nextFestival({ festivals: [] }, 5), null);
});

test('monthName maps 1..12 to English month names', () => {
  assert.equal(monthName(1), 'January');
  assert.equal(monthName(12), 'December');
});
