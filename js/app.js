/**
 * App entry point — DOM wiring only, no business logic.
 *
 * Reads the form, hands raw values to the engine (which validates them
 * itself), and delegates rendering to the view modules. The AI box fills
 * the same form the user could fill by hand, so both paths drive the
 * identical deterministic engine.
 */

import { normalizeContext } from './engine/context.js';
import { rankDestinations } from './engine/matcher.js';
import { buildItinerary } from './engine/itinerary.js';
import { hiddenGems } from './engine/gems.js';
import { festivalsIn, nextFestival } from './engine/events.js';
import { matchExperiences } from './engine/experiences.js';
import { recommendDestinations } from './ai/recommender.js';
import { wireAiBox, getApiKey } from './ui/aiBox.js';
import { renderMatches, renderAiMatches } from './ui/matchesView.js';
import { renderTripIntro, renderTripDays, renderTripEstimate, renderTripNotes } from './ui/tripView.js';
import { renderGems, renderEvents, renderExperiences } from './ui/discoverView.js';
import { readJson, writeJson } from './ui/storage.js';

const CONTEXT_STORE = 'context';
const AI_MODE_STORE = 'aiRecommend';

const $ = (id) => document.getElementById(id);

/** The last raw form values — the single source both matcher and itinerary see. */
let lastRaw = {};

function announce(message) {
  $('app-status').textContent = message;
}

function readForm() {
  const form = $('trip-form');
  const data = new FormData(form);
  return {
    month: data.get('month'),
    days: data.get('days'),
    interests: data.getAll('interests'),
    pace: data.get('pace'),
    budget: data.get('budget'),
    crowd: data.get('crowd'),
    party: data.get('party'),
    region: data.get('region'),
    mobility: data.get('mobility') === 'true',
  };
}

/** Reflect a normalized context back into the form controls. */
function fillForm(ctx) {
  $('month').value = String(ctx.month);
  $('days').value = String(ctx.days);
  $('region').value = ctx.region;
  for (const box of document.querySelectorAll('input[name="interests"]')) {
    box.checked = ctx.interests.includes(box.value);
  }
  for (const name of ['pace', 'budget', 'crowd', 'party']) {
    for (const radio of document.querySelectorAll(`input[name="${name}"]`)) {
      radio.checked = radio.value === ctx[name];
    }
  }
  document.querySelector('input[name="mobility"]').checked = ctx.mobility;
}

/** Rule-based ranking as the default and the AI's transparency cross-check. */
function showDeterministicMatches(result) {
  renderMatches($('match-cards'), result, showTrip);
  announce(`Found your top destinations — ${result.ranked[0].destination.name} leads.`);
}

/** destinationId → 1-based rule-based rank, for the AI cards' cross-check. */
function rankLookupFrom(result) {
  return new Map(result.ranked.map((entry, i) => [entry.destination.id, i + 1]));
}

async function showMatches() {
  lastRaw = readForm();
  writeJson(CONTEXT_STORE, lastRaw);

  // The rule-based ranking always runs: it's the default view, the AI's
  // honesty cross-check, and the fallback if the AI path can't be used.
  const result = rankDestinations(lastRaw);
  const wantAi = $('ai-recommend').checked;
  const apiKey = wantAi ? getApiKey() : '';

  $('matches').hidden = false;
  $('trip').hidden = true;

  if (wantAi && apiKey) {
    announce('Asking the AI to reason over the catalog…');
    try {
      const grounded = await recommendDestinations(lastRaw, apiKey);
      renderAiMatches($('match-cards'), grounded, rankLookupFrom(result), showTrip);
      announce(`AI reasoned over the catalog — ${grounded.recommendations[0].destination.name} leads.`);
    } catch (err) {
      // No fabricated output: show the real error, then the rule-based result.
      showDeterministicMatches(result);
      announce(`AI recommendation unavailable (${err.message}) — showing the rule-based ranking instead.`);
    }
  } else {
    showDeterministicMatches(result);
    if (wantAi && !apiKey) {
      announce('Add a Gemini API key in the ✨ box above for AI recommendations — showing the rule-based ranking.');
    }
  }

  $('matches-heading').focus();
}

function showTrip(entry) {
  const { destination } = entry;
  const plan = buildItinerary(destination, lastRaw);
  const ctx = plan.context;

  renderTripIntro($('trip-intro'), plan);
  renderTripDays($('trip-days'), plan);
  renderTripEstimate($('trip-estimate'), plan);
  renderTripNotes($('trip-notes'), plan);
  renderGems($('gems-list'), hiddenGems(destination, ctx), destination);
  renderEvents($('events-list'), {
    now: festivalsIn(destination, ctx.month),
    next: nextFestival(destination, ctx.month),
    month: ctx.month,
  });
  renderExperiences($('experiences-list'), matchExperiences(destination, ctx), ctx);

  $('trip').hidden = false;
  announce(`Built your ${ctx.days}-day ${destination.name} itinerary.`);
  $('trip-heading').focus();
}

function restoreOrDefault() {
  if (readJson(AI_MODE_STORE) === true) $('ai-recommend').checked = true;

  const saved = readJson(CONTEXT_STORE);
  if (saved) {
    fillForm(normalizeContext(saved));
    return;
  }
  // First visit: default the month to now — most people plan for soon.
  $('month').value = String(new Date().getMonth() + 1);
}

$('trip-form').addEventListener('submit', (event) => {
  event.preventDefault();
  showMatches();
});

// Remember the AI-recommendation toggle across visits.
$('ai-recommend').addEventListener('change', (event) => {
  writeJson(AI_MODE_STORE, event.target.checked);
});

$('print-btn').addEventListener('click', () => window.print());

wireAiBox({
  onContext: (raw) => fillForm(normalizeContext(raw)),
});

restoreOrDefault();
