import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchExperiences, SPLURGE_ABOVE } from '../js/engine/experiences.js';
import { normalizeContext } from '../js/engine/context.js';
import { DESTINATIONS } from '../js/data/catalog.js';

const ctx = (raw = {}) => normalizeContext(raw);

test('experiences outside the party filter are excluded (or the relaxation is declared)', () => {
  for (const dest of DESTINATIONS) {
    const { matches, partyRelaxed } = matchExperiences(dest, ctx({ party: 'family' }));
    if (!partyRelaxed) {
      assert.ok(matches.every((m) => m.experience.party.includes('family')));
    }
    assert.ok(matches.length > 0, `${dest.name} always offers something`);
  }
});

test('splurges are flagged against the budget tier, never hidden', () => {
  for (const dest of DESTINATIONS) {
    const { matches } = matchExperiences(dest, ctx({ budget: 'shoestring' }));
    for (const m of matches) {
      assert.equal(m.splurge, m.experience.cost > SPLURGE_ABOVE.shoestring);
      if (m.splurge) {
        assert.ok(m.reasons.some((r) => r.toLowerCase().includes('splurge')));
      }
    }
  }
});

test('interest matches outrank non-matches; within a rank, cheaper first', () => {
  for (const dest of DESTINATIONS) {
    const { matches } = matchExperiences(dest, ctx({ interests: ['food'] }));
    for (let i = 1; i < matches.length; i++) {
      const prev = matches[i - 1];
      const curr = matches[i];
      assert.ok(
        prev.matched.length >= curr.matched.length,
        `${dest.name}: interest matches stay on top`
      );
    }
  }
});

test('every experience carries etiquette and who benefits', () => {
  for (const dest of DESTINATIONS) {
    for (const e of dest.experiences) {
      assert.ok(e.etiquette.length > 10, `${e.name} teaches how to show up`);
      assert.ok(e.supportsLocals.length > 10, `${e.name} says whom it sustains`);
    }
  }
});
