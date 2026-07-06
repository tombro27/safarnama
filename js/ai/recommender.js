/**
 * GenAI feature 3 — grounded recommendation (retrieval-augmented reasoning).
 *
 * This is the "let the model be the brain" layer. Instead of the fixed
 * scoring weights in js/engine/matcher.js, Gemini reasons over the WHOLE
 * catalog and the traveller's context and argues for the best-fitting
 * destinations in natural language — catching nuance a fixed formula can't
 * ("crafts AND crowd-averse AND first trip → living craft villages, not the
 * tourist machinery").
 *
 * The catch that makes it honest is the FENCE: the model may only return
 * catalog ids, and groundRecommendations() throws away anything that isn't
 * a real place. The model supplies the *reasoning*; the catalog supplies
 * every *fact* shown to the user. So the model can misjudge fit, but it can
 * never invent a destination, an attraction, or a fact — the exact failure
 * mode that keeps a pure-LLM travel app from being trustworthy.
 *
 * Why "retrieval-augmented" for a 12-entry catalog: the whole catalog fits
 * in context, so retrieval is a compaction (catalogDigest) rather than a
 * vector search — the same grounding discipline without the machinery.
 */

import { generateJson } from './client.js';
import { DESTINATIONS, destinationById } from '../data/catalog.js';
import { normalizeContext, INTERESTS, MONTH_NAMES } from '../engine/context.js';

/** How many ranked recommendations we ask the model for. */
const WANT = 4;

/**
 * A compact, faithful projection of the catalog for the model to reason
 * over — every field here is ground truth it may cite by id. Kept small
 * (no long stories/facts) so the whole catalog fits comfortably in context.
 *
 * @returns {Array<object>}
 */
export function catalogDigest() {
  return DESTINATIONS.map((d) => ({
    id: d.id,
    name: d.name,
    state: d.state,
    region: d.region,
    tagline: d.tagline,
    interests: d.interests,
    popularity: d.popularity,
    bestMonths: d.bestMonths,
    costPerDay: d.costPerDay,
    festivals: d.festivals.map((f) => ({ name: f.name, months: f.months })),
    attractions: d.attractions.map((a) => ({
      id: a.id,
      name: a.name,
      kind: a.kind,
      interests: a.interests,
      popularity: a.popularity,
      culturalValue: a.culturalValue,
      mobilityFriendly: a.mobilityFriendly,
    })),
  }));
}

/** Structured output contract — ids plus the model's reasoning, no free facts. */
const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    recommendations: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          destinationId: { type: 'STRING' },
          fitReason: { type: 'STRING' },
          highlightIds: { type: 'ARRAY', items: { type: 'STRING' } },
          watchOut: { type: 'STRING' },
        },
        required: ['destinationId', 'fitReason', 'highlightIds', 'watchOut'],
      },
    },
  },
  required: ['recommendations'],
};

const SYSTEM_PROMPT = [
  'You are a discerning India travel-culture expert. You recommend destinations for ONE traveller,',
  'chosen ONLY from the fixed CATALOG you are given. Rank the best-fitting destinations, best first.',
  '',
  'HARD RULES (a violation makes the answer useless):',
  '- Recommend ONLY destinations whose "id" appears in the catalog. NEVER invent a destination.',
  '- highlightIds must be attraction "id"s belonging to that same destination in the catalog.',
  '- Never assert a fact, date, name, or claim about a place beyond what the catalog states. You reason',
  '  about FIT; you do not add facts.',
  '',
  'HOW TO REASON — weave the traveller\'s whole context together, do not just echo one field:',
  '- interests: match against each destination\'s interest affinities and its attractions.',
  '- month vs bestMonths: if the traveller\'s month is outside a destination\'s best months, be HONEST',
  '  about heat/rain/off-season in watchOut rather than hiding it.',
  '- crowd: for crowd-averse travellers prefer lower-popularity places; for buzz-seekers, the opposite.',
  '- budget: respect the tier (costPerDay); do not push a premium-feeling trip on a shoestring.',
  '- mobility: if the traveller needs step-free access, favour destinations with enough mobilityFriendly',
  '  attractions and flag the barriers in watchOut.',
  '- festivals: a festival whose months include the travel month is a strong reason — mention it.',
  '',
  'For each recommendation give: destinationId, a fitReason written to THIS traveller (2-3 sentences,',
  'second person, specific to their inputs), 1-3 highlightIds, and one honest watchOut.',
  `Return ${WANT} recommendations if the catalog supports it.`,
].join('\n');

/**
 * Render the normalized traveller context as a short brief for the model.
 * @param {object} ctx normalized context
 * @returns {string}
 */
function travellerBrief(ctx) {
  const interests = ctx.interests.map((k) => INTERESTS[k]).join(', ');
  return [
    `Month of travel: ${MONTH_NAMES[ctx.month - 1]}`,
    `Trip length: ${ctx.days} days`,
    `Interests: ${interests}`,
    `Pace: ${ctx.pace}`,
    `Budget tier: ${ctx.budget}`,
    `Crowd preference: ${ctx.crowd}`,
    `Travelling as: ${ctx.party}`,
    `Region preference: ${ctx.region}`,
    `Needs step-free access: ${ctx.mobility ? 'yes' : 'no'}`,
  ].join('\n');
}

/**
 * THE FENCE. Validate a raw model response against the real catalog and
 * resolve it into display-ready recommendations carrying only real objects.
 *
 * Pure and model-free, so the anti-hallucination guarantee is unit-tested
 * without any API call:
 *   - unknown / duplicate destinationIds are dropped (and counted),
 *   - highlightIds that don't belong to the destination are dropped,
 *   - the model's ordering (its ranking) is preserved,
 *   - the fact-bearing objects come from the catalog, never the model.
 *
 * @param {any} modelOutput parsed model JSON (shape not trusted)
 * @param {object} ctx normalized context (unused for now; kept for parity
 *   with engine signatures and future context-aware filtering)
 * @returns {{recommendations: Array<{destination: object, fitReason: string,
 *   highlights: object[], watchOut: string}>, rejected: string[]}}
 */
export function groundRecommendations(modelOutput, ctx) {
  const raw = Array.isArray(modelOutput?.recommendations) ? modelOutput.recommendations : [];
  const recommendations = [];
  const rejected = [];
  const seen = new Set();

  for (const rec of raw) {
    const id = typeof rec?.destinationId === 'string' ? rec.destinationId : null;
    const destination = id ? destinationById(id) : undefined;
    if (!destination || seen.has(id)) {
      if (id && !destination) rejected.push(id); // a hallucinated place — fenced out
      continue;
    }
    seen.add(id);

    const validIds = new Set(destination.attractions.map((a) => a.id));
    const highlights = (Array.isArray(rec.highlightIds) ? rec.highlightIds : [])
      .filter((hid) => validIds.has(hid))
      .map((hid) => destination.attractions.find((a) => a.id === hid));

    recommendations.push({
      destination,
      fitReason: typeof rec.fitReason === 'string' ? rec.fitReason : '',
      highlights,
      watchOut: typeof rec.watchOut === 'string' ? rec.watchOut : '',
    });
  }

  return { recommendations, rejected };
}

/**
 * Ask Gemini to reason over the catalog for this traveller, then fence the
 * result to real places.
 *
 * @param {object} rawContext values from the form (or the trip parser)
 * @param {string} apiKey Gemini API key (kept in memory/session only)
 * @returns {Promise<{context: object, recommendations: Array, rejected: string[]}>}
 * @throws {Error} descriptive error when the call fails — callers show it as-is
 */
export async function recommendDestinations(rawContext, apiKey) {
  const ctx = normalizeContext(rawContext);
  const user = [
    'TRAVELLER:',
    travellerBrief(ctx),
    '',
    'CATALOG (the only destinations and attractions you may use):',
    JSON.stringify(catalogDigest()),
  ].join('\n');

  const modelOutput = await generateJson({
    apiKey,
    system: SYSTEM_PROMPT,
    user,
    schema: RESPONSE_SCHEMA,
    temperature: 0.3,
  });

  const grounded = groundRecommendations(modelOutput, ctx);
  if (grounded.recommendations.length === 0) {
    throw new Error('The AI did not return any recommendation that matched our catalog.');
  }
  return { context: ctx, ...grounded };
}
