import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groundRecommendations, catalogDigest } from '../js/ai/recommender.js';
import { normalizeContext } from '../js/engine/context.js';
import { DESTINATIONS } from '../js/data/catalog.js';

const ctx = normalizeContext({});

test('the fence drops hallucinated destinations and records them', () => {
  const output = {
    recommendations: [
      { destinationId: 'jaipur', fitReason: 'r', highlightIds: [], watchOut: 'w' },
      { destinationId: 'atlantis', fitReason: 'r', highlightIds: [], watchOut: 'w' },
      { destinationId: 'shangri_la', fitReason: 'r', highlightIds: [], watchOut: 'w' },
    ],
  };
  const { recommendations, rejected } = groundRecommendations(output, ctx);
  assert.deepEqual(recommendations.map((r) => r.destination.id), ['jaipur']);
  assert.deepEqual(rejected.sort(), ['atlantis', 'shangri_la']);
});

test('the fence resolves ids to the real, fact-checked catalog objects', () => {
  const output = {
    recommendations: [{ destinationId: 'hampi', fitReason: 'r', highlightIds: [], watchOut: 'w' }],
  };
  const { recommendations } = groundRecommendations(output, ctx);
  const real = DESTINATIONS.find((d) => d.id === 'hampi');
  // Not a copy the model authored — the actual catalog object.
  assert.equal(recommendations[0].destination, real);
});

test('highlightIds are fenced to attractions that belong to that destination', () => {
  const jaipur = DESTINATIONS.find((d) => d.id === 'jaipur');
  const realAttraction = jaipur.attractions[0].id;
  const foreignAttraction = DESTINATIONS.find((d) => d.id === 'hampi').attractions[0].id;
  const output = {
    recommendations: [
      {
        destinationId: 'jaipur',
        fitReason: 'r',
        highlightIds: [realAttraction, foreignAttraction, 'made_up_place'],
        watchOut: 'w',
      },
    ],
  };
  const { recommendations } = groundRecommendations(output, ctx);
  assert.deepEqual(recommendations[0].highlights.map((a) => a.id), [realAttraction]);
});

test('duplicate destinationIds are collapsed to one', () => {
  const output = {
    recommendations: [
      { destinationId: 'kochi', fitReason: 'a', highlightIds: [], watchOut: 'w' },
      { destinationId: 'kochi', fitReason: 'b', highlightIds: [], watchOut: 'w' },
    ],
  };
  const { recommendations } = groundRecommendations(output, ctx);
  assert.equal(recommendations.length, 1);
});

test("the model's ranking order is preserved", () => {
  const output = {
    recommendations: [
      { destinationId: 'puri', fitReason: 'r', highlightIds: [], watchOut: 'w' },
      { destinationId: 'amritsar', fitReason: 'r', highlightIds: [], watchOut: 'w' },
      { destinationId: 'bhuj', fitReason: 'r', highlightIds: [], watchOut: 'w' },
    ],
  };
  const { recommendations } = groundRecommendations(output, ctx);
  assert.deepEqual(recommendations.map((r) => r.destination.id), ['puri', 'amritsar', 'bhuj']);
});

test('malformed model output degrades safely to an empty result', () => {
  for (const junk of [null, {}, { recommendations: null }, { recommendations: ['x', 42] }]) {
    const { recommendations, rejected } = groundRecommendations(junk, ctx);
    assert.deepEqual(recommendations, []);
    assert.deepEqual(rejected, []);
  }
});

test('non-string / missing fields never crash the fence', () => {
  const output = {
    recommendations: [
      { destinationId: 'orchha', fitReason: 123, highlightIds: 'nope', watchOut: null },
    ],
  };
  const { recommendations } = groundRecommendations(output, ctx);
  assert.equal(recommendations[0].destination.id, 'orchha');
  assert.equal(recommendations[0].fitReason, '');
  assert.deepEqual(recommendations[0].highlights, []);
  assert.equal(recommendations[0].watchOut, '');
});

test('catalogDigest exposes every destination and only ground-truth fields', () => {
  const digest = catalogDigest();
  assert.equal(digest.length, DESTINATIONS.length);
  const sample = digest.find((d) => d.id === 'varanasi');
  // Ground-truth fields the model reasons over…
  for (const key of ['id', 'name', 'region', 'interests', 'bestMonths', 'costPerDay', 'attractions']) {
    assert.ok(key in sample, `digest carries ${key}`);
  }
  // …but not the long prose the model must not parrot as its own.
  assert.ok(!('heritage' in sample));
  assert.ok(sample.attractions.every((a) => !('story' in a) && !('facts' in a)));
});
