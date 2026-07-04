import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DESTINATIONS, destinationById } from '../js/data/catalog.js';
import { INTEREST_KEYS, REGIONS } from '../js/engine/context.js';
import { rankDestinations } from '../js/engine/matcher.js';

const ATTRACTION_KINDS = ['monument', 'temple', 'museum', 'market', 'neighbourhood', 'nature', 'food', 'craft'];
const EXPERIENCE_KINDS = ['workshop', 'food', 'performance', 'stay', 'walk', 'ritual'];
const BEST_TIMES = ['morning', 'afternoon', 'evening', 'any'];
const PARTY_VALUES = ['solo', 'couple', 'family', 'friends'];

const inRange = (n, lo, hi) => typeof n === 'number' && n >= lo && n <= hi;

test('the catalog covers 12 destinations with unique ids, across all regions', () => {
  assert.equal(DESTINATIONS.length, 12);
  const ids = DESTINATIONS.map((d) => d.id);
  assert.equal(new Set(ids).size, ids.length);
  const covered = new Set(DESTINATIONS.map((d) => d.region));
  for (const region of REGIONS.filter((r) => r !== 'any')) {
    assert.ok(covered.has(region), `region ${region} has a destination`);
  }
  assert.equal(destinationById('jaipur')?.name, 'Jaipur');
});

test('every destination entry is structurally sound', () => {
  for (const d of DESTINATIONS) {
    assert.ok(d.tagline.length > 0 && d.heritage.length > 40, `${d.id} is described`);
    assert.ok(inRange(d.popularity, 0, 1));
    assert.ok(d.bestMonths.length >= 3 && d.bestMonths.every((m) => inRange(m, 1, 12)));
    assert.ok(
      d.costPerDay.shoestring < d.costPerDay.comfortable &&
        d.costPerDay.comfortable < d.costPerDay.premium,
      `${d.id} cost tiers are ordered`
    );
    for (const key of INTEREST_KEYS) {
      assert.ok(inRange(d.interests[key], 0, 1), `${d.id} rates interest ${key}`);
    }
  }
});

test('every attraction is structurally sound and grounded in facts', () => {
  const seenIds = new Set();
  for (const d of DESTINATIONS) {
    assert.ok(d.attractions.length >= 9, `${d.id} has enough attractions`);
    for (const a of d.attractions) {
      assert.ok(!seenIds.has(a.id), `attraction id ${a.id} is unique`);
      seenIds.add(a.id);
      assert.ok(ATTRACTION_KINDS.includes(a.kind), `${a.id} kind`);
      assert.ok(BEST_TIMES.includes(a.bestTime), `${a.id} bestTime`);
      assert.ok(inRange(a.popularity, 0, 1) && inRange(a.culturalValue, 0, 1));
      assert.ok(inRange(a.hours, 0.5, 4), `${a.id} visit length`);
      assert.ok(a.entryCost >= 0, `${a.id} entry cost`);
      assert.ok(a.interests.length >= 1 && a.interests.every((k) => INTEREST_KEYS.includes(k)));
      assert.ok(a.story.length > 40, `${a.id} tells a story`);
      assert.ok(a.facts.length >= 2, `${a.id} is grounded in facts`);
      assert.match(a.zone, /^[a-z][a-z0-9-]*$/, `${a.id} zone label`);
    }
    const zones = new Set(d.attractions.map((a) => a.zone));
    assert.ok(zones.size >= 2, `${d.id} clusters into at least two zones`);
    const stepFree = d.attractions.filter((a) => a.mobilityFriendly);
    assert.ok(stepFree.length >= 4, `${d.id} supports step-free trips`);
  }
});

test('every experience and festival is structurally sound', () => {
  for (const d of DESTINATIONS) {
    assert.ok(d.experiences.length >= 4, `${d.id} offers experiences`);
    for (const e of d.experiences) {
      assert.ok(EXPERIENCE_KINDS.includes(e.kind), `${e.id} kind`);
      assert.ok(e.party.length >= 1 && e.party.every((p) => PARTY_VALUES.includes(p)));
      assert.ok(e.cost >= 0 && e.hours > 0);
      assert.ok(e.interests.every((k) => INTEREST_KEYS.includes(k)));
    }
    assert.ok(d.festivals.length >= 2, `${d.id} has festivals`);
    for (const f of d.festivals) {
      assert.ok(f.months.length >= 1 && f.months.every((m) => inRange(m, 1, 12)));
      assert.ok(f.whyGo.length > 10 && f.etiquette.length > 10);
    }
  }
});

test('every interest leads somewhere excellent', () => {
  for (const key of INTEREST_KEYS) {
    const best = Math.max(...DESTINATIONS.map((d) => d.interests[key] ?? 0));
    assert.ok(best >= 0.7, `some destination is strong for ${key} (best: ${best})`);
  }
});

test('no month strands the traveler — off-season is advice, not a wall', () => {
  // Deep summer and monsoon months honestly have no peak destination in the
  // catalog; the app's promise is a full, season-honest ranking regardless.
  for (let month = 1; month <= 12; month++) {
    const { ranked } = rankDestinations({ month });
    assert.equal(ranked.length, DESTINATIONS.length, `month ${month} still ranks everything`);
    assert.ok(
      ranked[0].reasons.some((r) => r.toLowerCase().includes('season')),
      `month ${month}'s top pick states its season`
    );
  }
});
