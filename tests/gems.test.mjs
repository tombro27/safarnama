import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hiddenGems, isHiddenGem, GEM_MAX_POPULARITY, GEM_MIN_CULTURAL_VALUE } from '../js/engine/gems.js';
import { normalizeContext } from '../js/engine/context.js';
import { DESTINATIONS } from '../js/data/catalog.js';

const ctx = (raw = {}) => normalizeContext(raw);

test('every surfaced gem actually meets the gem thresholds', () => {
  for (const dest of DESTINATIONS) {
    for (const gem of hiddenGems(dest, ctx())) {
      assert.ok(gem.attraction.popularity <= GEM_MAX_POPULARITY);
      assert.ok(gem.attraction.culturalValue >= GEM_MIN_CULTURAL_VALUE);
      assert.ok(gem.reasons.length > 0, 'gems are argued for, not asserted');
    }
  }
});

test('gems serving the traveler’s interests rank first', () => {
  for (const dest of DESTINATIONS) {
    const gems = hiddenGems(dest, ctx({ interests: ['crafts'] }));
    const firstMiss = gems.findIndex((g) => g.matched.length === 0);
    const lastHit = gems.map((g) => g.matched.length > 0).lastIndexOf(true);
    if (firstMiss !== -1 && lastHit !== -1) {
      assert.ok(lastHit < firstMiss, `${dest.name}: interest matches come first`);
    }
  }
});

test('mobility flags gems honestly instead of hiding them', () => {
  for (const dest of DESTINATIONS) {
    const gems = hiddenGems(dest, ctx({ mobility: true }));
    for (const gem of gems) {
      if (!gem.attraction.mobilityFriendly) {
        assert.equal(gem.accessible, false);
        assert.ok(gem.reasons.some((r) => r.includes('steps or uneven ground')));
      }
    }
  }
});

test('catalog sanity: every destination hides at least three gems', () => {
  for (const dest of DESTINATIONS) {
    const gems = dest.attractions.filter(isHiddenGem);
    assert.ok(gems.length >= 3, `${dest.name} has ${gems.length} gems`);
  }
});
