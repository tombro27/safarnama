import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rankDestinations, seasonFor, formatMonths, SHORTLIST_SIZE } from '../js/engine/matcher.js';
import { DESTINATIONS } from '../js/data/catalog.js';

test('ranks the whole catalog and explains every entry', () => {
  const { ranked } = rankDestinations({});
  assert.equal(ranked.length, DESTINATIONS.length);
  for (const entry of ranked) {
    assert.ok(entry.reasons.length >= 3, `${entry.destination.name} ships with reasons`);
    assert.ok(entry.score >= 0 && entry.score <= 1.0001);
  }
});

test('matching is deterministic — same inputs, same ranking', () => {
  const input = { month: 2, interests: ['crafts', 'food'], crowd: 'avoid' };
  const a = rankDestinations(input).ranked.map((e) => e.destination.id);
  const b = rankDestinations(input).ranked.map((e) => e.destination.id);
  assert.deepEqual(a, b);
});

test('a region preference is a hard filter', () => {
  const { ranked, regionRelaxed } = rankDestinations({ region: 'south' });
  assert.equal(regionRelaxed, false);
  assert.ok(ranked.length > 0);
  assert.ok(ranked.every((e) => e.destination.region === 'south'));
});

test('crowd-averse travelers get quieter places on top', () => {
  const avgTopPopularity = (crowd) =>
    rankDestinations({ crowd, interests: ['history'] })
      .ranked.slice(0, SHORTLIST_SIZE)
      .reduce((sum, e) => sum + e.destination.popularity, 0) / SHORTLIST_SIZE;
  assert.ok(
    avgTopPopularity('avoid') < avgTopPopularity('buzz'),
    'the avoid-crowds shortlist should be quieter than the buzz shortlist'
  );
});

test('interests move the ranking', () => {
  const top = (interests) => rankDestinations({ interests }).ranked[0].destination;
  const craftsTop = top(['crafts']);
  assert.ok(
    craftsTop.interests.crafts >= 0.7,
    `top crafts pick (${craftsTop.name}) should actually be a crafts destination`
  );
  const spiritualTop = top(['spiritual']);
  assert.ok(spiritualTop.interests.spiritual >= 0.7);
});

test('a festival in the travel month is called out in the reasons', () => {
  // Find any destination+month pair with a festival, then check its reasons.
  const dest = DESTINATIONS.find((d) => d.festivals.length > 0);
  const month = dest.festivals[0].months[0];
  const { ranked } = rankDestinations({ month });
  const entry = ranked.find((e) => e.destination.id === dest.id);
  assert.ok(
    entry.reasons.some((r) => r.includes(dest.festivals[0].name)),
    'festival luck should be part of the argument'
  );
});

test('season honesty: off-season is stated, not hidden', () => {
  // Every destination has some off month; its reason must admit it.
  for (const dest of DESTINATIONS.slice(0, 3)) {
    const offMonth = [...Array(12).keys()]
      .map((i) => i + 1)
      .find((m) => seasonFor(dest, m) === 'off');
    if (!offMonth) continue;
    const { ranked } = rankDestinations({ month: offMonth, region: dest.region });
    const entry = ranked.find((e) => e.destination.id === dest.id);
    assert.ok(entry.reasons.some((r) => r.toLowerCase().includes('off-season')));
  }
});

test('seasonFor: peak in a best month, shoulder next door, off far away', () => {
  const dest = { bestMonths: [10, 11, 12] };
  assert.equal(seasonFor(dest, 11), 'peak');
  assert.equal(seasonFor(dest, 9), 'shoulder');
  assert.equal(seasonFor(dest, 1), 'shoulder'); // cyclic: December's neighbour
  assert.equal(seasonFor(dest, 5), 'off');
});

test('formatMonths renders compact cyclic ranges', () => {
  assert.equal(formatMonths([10, 11, 12, 1, 2]), 'October–February');
  assert.equal(formatMonths([3]), 'March');
  assert.equal(formatMonths([1, 2, 3, 10, 11]), 'January–March, October–November');
  assert.equal(formatMonths([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]), 'all year');
});
