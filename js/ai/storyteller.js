/**
 * GenAI feature 2 — grounded immersive storytelling.
 *
 * "Story mode" turns a place's curated, fact-checked catalog facts into an
 * evocative second-person narrative. The grounding is the whole point:
 * the model may only build atmosphere around the facts we hand it — it is
 * explicitly forbidden to invent names, dates or legends. Without an API
 * key the app still tells stories: every place ships with a hand-written
 * one in the catalog, and this feature only ever *adds* to that.
 */

import { generateJson } from './client.js';

/** How many top attractions lend their leading fact to a city-level story. */
const CITY_STORY_SOURCES = 4;

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING' },
    story: { type: 'STRING' },
  },
  required: ['title', 'story'],
};

const SYSTEM_PROMPT = [
  'You are a master travel storyteller. Write an immersive story of 150-220 words',
  'about the place described, in second person, present tense: put the reader there —',
  'sounds, light, textures, people at work.',
  'HARD RULES:',
  '- Every specific claim (names, dates, dynasties, rituals, crafts) must come from',
  '  the FACTS provided. Do not add facts, legends, or figures from outside them.',
  '- Atmosphere and sensory detail are welcome; invented specifics are not.',
  '- No cliches like "hidden jewel", "step back in time", "feast for the senses".',
  '- End with one concrete, practical sentence a visitor can act on, drawn from the facts.',
  'Also produce a short evocative title (max 8 words).',
].join('\n');

/**
 * Build the grounding package for a story about one attraction.
 *
 * @param {object} destination catalog destination the attraction belongs to
 * @param {object} attraction
 * @returns {{label: string, prompt: string}}
 */
export function attractionStorySubject(destination, attraction) {
  return {
    label: `${attraction.name}, ${destination.name}`,
    prompt: [
      `PLACE: ${attraction.name} (${attraction.kind}) in ${destination.name}, ${destination.state}, India.`,
      'FACTS (the only specifics you may use):',
      ...attraction.facts.map((fact) => `- ${fact}`),
      `- ${attraction.story}`,
    ].join('\n'),
  };
}

/**
 * Build the grounding package for a destination-level story, drawing on
 * the heritage summary and the leading fact of its most significant
 * attractions (deterministic: top cultural value, ties on name).
 *
 * @param {object} destination catalog destination entry
 * @returns {{label: string, prompt: string}}
 */
export function destinationStorySubject(destination) {
  const sources = [...destination.attractions]
    .sort((a, b) => b.culturalValue - a.culturalValue || a.name.localeCompare(b.name))
    .slice(0, CITY_STORY_SOURCES);
  return {
    label: `${destination.name}, ${destination.state}`,
    prompt: [
      `PLACE: the city of ${destination.name}, ${destination.state}, India.`,
      'FACTS (the only specifics you may use):',
      `- ${destination.heritage}`,
      ...sources.map((a) => `- ${a.name}: ${a.facts[0]}`),
    ].join('\n'),
  };
}

/**
 * @param {{label: string, prompt: string}} subject from a *StorySubject builder
 * @param {string} apiKey Gemini API key (kept in memory/session only)
 * @returns {Promise<{title: string, story: string}>}
 * @throws {Error} descriptive error when the call fails — callers show it as-is
 */
export async function tellStory(subject, apiKey) {
  const result = await generateJson({
    apiKey,
    system: SYSTEM_PROMPT,
    user: subject.prompt,
    schema: RESPONSE_SCHEMA,
    temperature: 0.7, // stories may vary; facts may not
  });
  if (typeof result.title !== 'string' || typeof result.story !== 'string') {
    throw new Error('Gemini returned an unexpected story shape.');
  }
  return { title: result.title, story: result.story };
}
