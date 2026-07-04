import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildItinerary, SLOTS_PER_DAY } from '../js/engine/itinerary.js';
import { DESTINATIONS, destinationById } from '../js/data/catalog.js';

const anyDest = () => DESTINATIONS[0];

test('never plans more days than the traveler has, nor overfills a day', () => {
  for (const pace of Object.keys(SLOTS_PER_DAY)) {
    const plan = buildItinerary(anyDest(), { days: 3, pace });
    assert.ok(plan.days.length <= 3);
    for (const day of plan.days) {
      assert.ok(day.items.length <= SLOTS_PER_DAY[pace], `${pace} day within slots`);
    }
  }
});

test('every planned item is explained', () => {
  const plan = buildItinerary(anyDest(), { interests: ['history', 'food'] });
  for (const day of plan.days) {
    assert.ok(day.title.length > 0, 'days are titled');
    for (const item of day.items) {
      assert.ok(item.why.length > 0, `${item.attraction.name} has reasons`);
    }
  }
});

test('the signature sight survives even a crowd-averse context', () => {
  for (const dest of DESTINATIONS) {
    const signature = dest.attractions.filter((a) => a.popularity >= 0.75);
    if (signature.length === 0) continue;
    const plan = buildItinerary(dest, { crowd: 'avoid', days: 4 });
    const planned = plan.days.flatMap((d) => d.items);
    const anchor = planned.find((i) => i.anchor);
    assert.ok(anchor, `${dest.name} keeps its signature sight`);
    assert.ok(
      anchor.why.some((w) => w.includes('before the crowds')),
      'crowd-averse anchors are scheduled to beat the crowds'
    );
  }
});

test('mobility is a hard constraint — and the exclusions are reported', () => {
  for (const dest of DESTINATIONS) {
    const plan = buildItinerary(dest, { mobility: true, days: 5, pace: 'packed' });
    for (const item of plan.days.flatMap((d) => d.items)) {
      assert.ok(item.attraction.mobilityFriendly, `${item.attraction.name} is step-free`);
    }
    const hasBarriers = dest.attractions.some((a) => !a.mobilityFriendly);
    if (hasBarriers) {
      assert.ok(
        plan.notes.some((n) => n.includes('step-free')),
        `${dest.name}: skipped places are disclosed`
      );
    }
  }
});

test('same-zone attractions are not scattered across the trip', () => {
  const plan = buildItinerary(anyDest(), { days: 4, pace: 'balanced' });
  // A zone, once left, is never returned to on a later day.
  const seen = new Set();
  let previous = null;
  for (const day of plan.days) {
    for (const item of day.items) {
      const zone = item.attraction.zone;
      if (zone !== previous) {
        assert.ok(!seen.has(zone), `${zone} appears in one contiguous run`);
        seen.add(zone);
        previous = zone;
      }
    }
  }
});

test('a festival month claims the first evening', () => {
  const dest = DESTINATIONS.find((d) => d.festivals.length > 0);
  const month = dest.festivals[0].months[0];
  const plan = buildItinerary(dest, { month, days: 3 });
  assert.equal(plan.days[0].evening?.type, 'festival');
});

test('evenings without festivals get authentic experiences, none repeated', () => {
  const dest = anyDest();
  const monthWithout = [...Array(12).keys()]
    .map((i) => i + 1)
    .find((m) => dest.festivals.every((f) => !f.months.includes(m)));
  const plan = buildItinerary(dest, { month: monthWithout, days: 4 });
  const evenings = plan.days.map((d) => d.evening).filter(Boolean);
  assert.ok(evenings.length > 0, 'evenings are programmed');
  assert.ok(evenings.every((e) => e.type === 'experience'));
  const ids = evenings.map((e) => e.entry.experience.id);
  assert.equal(new Set(ids).size, ids.length, 'no experience repeats');
});

test('the estimate adds up and scales with the budget tier', () => {
  const dest = anyDest();
  const plan = buildItinerary(dest, { days: 4, budget: 'comfortable' });
  const { base, entries, experiences, total } = plan.estimate;
  assert.equal(total, base + entries + experiences);
  assert.equal(base, 4 * dest.costPerDay.comfortable);

  const premium = buildItinerary(dest, { days: 4, budget: 'premium' });
  assert.ok(premium.estimate.base > plan.estimate.base);
});

test('packed pace sees more than relaxed pace', () => {
  const count = (pace) =>
    buildItinerary(anyDest(), { days: 4, pace }).days.flatMap((d) => d.items).length;
  assert.ok(count('packed') > count('relaxed'));
});

test('interests reshape the plan', () => {
  const dest = destinationById('jaipur') ?? anyDest();
  const planned = (interests) =>
    buildItinerary(dest, { interests, days: 3 }).days
      .flatMap((d) => d.items)
      .map((i) => i.attraction.id)
      .join(',');
  assert.notEqual(
    planned(['crafts', 'folk']),
    planned(['nature', 'spiritual']),
    'different loves, different trip'
  );
});

test('itinerary is deterministic — same inputs, same trip', () => {
  const input = { month: 12, days: 5, pace: 'packed', interests: ['architecture'] };
  const a = buildItinerary(anyDest(), input);
  const b = buildItinerary(anyDest(), input);
  assert.deepEqual(
    a.days.map((d) => d.items.map((i) => i.attraction.id)),
    b.days.map((d) => d.items.map((i) => i.attraction.id))
  );
});
