import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeContext, INTEREST_KEYS } from '../js/engine/context.js';

test('empty input produces a complete, sane default context', () => {
  const ctx = normalizeContext({});
  assert.equal(ctx.month, 11);
  assert.equal(ctx.days, 4);
  assert.ok(ctx.interests.length > 0, 'default interests are never empty');
  assert.equal(ctx.pace, 'balanced');
  assert.equal(ctx.budget, 'comfortable');
  assert.equal(ctx.crowd, 'mixed');
  assert.equal(ctx.party, 'couple');
  assert.equal(ctx.region, 'any');
  assert.equal(ctx.mobility, false);
});

test('junk numbers are clamped to sane ranges', () => {
  assert.equal(normalizeContext({ month: 99 }).month, 12);
  assert.equal(normalizeContext({ month: -3 }).month, 1);
  assert.equal(normalizeContext({ days: 'lots' }).days, 4);
  assert.equal(normalizeContext({ days: 400 }).days, 14);
  assert.equal(normalizeContext({ days: 0 }).days, 1);
});

test('unknown interests are dropped, duplicates collapsed', () => {
  const ctx = normalizeContext({ interests: ['food', 'food', 'hacking', 'crafts'] });
  assert.deepEqual(ctx.interests, ['food', 'crafts']);
});

test('all-invalid interests fall back to the default set', () => {
  const ctx = normalizeContext({ interests: ['<script>', 42] });
  assert.ok(ctx.interests.length >= 2);
  assert.ok(ctx.interests.every((k) => INTEREST_KEYS.includes(k)));
});

test('unknown enum values fall back to defaults', () => {
  const ctx = normalizeContext({ pace: 'ludicrous', budget: 'infinite', crowd: 'moshpit', party: 'circus', region: 'mars' });
  assert.equal(ctx.pace, 'balanced');
  assert.equal(ctx.budget, 'comfortable');
  assert.equal(ctx.crowd, 'mixed');
  assert.equal(ctx.party, 'couple');
  assert.equal(ctx.region, 'any');
});

test('mobility accepts boolean true and the string "true" only', () => {
  assert.equal(normalizeContext({ mobility: true }).mobility, true);
  assert.equal(normalizeContext({ mobility: 'true' }).mobility, true);
  assert.equal(normalizeContext({ mobility: 'yes' }).mobility, false);
  assert.equal(normalizeContext({ mobility: 1 }).mobility, false);
});
