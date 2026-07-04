/**
 * Low-level Gemini client shared by every AI feature.
 *
 * Design rules (identical for all callers):
 *   - AI is an enhancement, never a dependency: everything in the app has
 *     a fully working non-AI path.
 *   - No fabricated output: when a call fails we surface the real error —
 *     we never pretend the model answered.
 *   - Every response is JSON-schema-constrained AND still validated or
 *     normalized by the caller, so a malformed reply cannot corrupt state.
 *   - The user's key lives in memory / tab session storage only and is
 *     sent to Google's endpoint alone.
 */

/** Tried in order — the lite model is the fallback if the key's project
 *  doesn't have access to the primary one. */
const MODELS = ['gemini-3.5-flash', 'gemini-3.1-flash-lite'];
const endpointFor = (model) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
const TIMEOUT_MS = 20_000;

function httpErrorHint(status) {
  if (status === 400 || status === 403) return 'The API key looks invalid.';
  if (status === 429) return 'Rate limit hit — wait a moment and retry.';
  return `Gemini returned HTTP ${status}.`;
}

/**
 * Make one schema-constrained JSON generation call.
 *
 * @param {{apiKey: string, system: string, user: string, schema: object,
 *   temperature?: number}} req
 * @returns {Promise<object>} the parsed JSON object the model produced
 * @throws {Error} descriptive error when the call fails — callers show it as-is
 */
export async function generateJson({ apiKey, system, user, schema, temperature = 0 }) {
  let response;
  for (const [index, model] of MODELS.entries()) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      response = await fetch(endpointFor(model), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: user }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: schema,
            temperature,
          },
        }),
        signal: controller.signal,
      });
    } catch (err) {
      throw new Error(
        err.name === 'AbortError'
          ? 'The AI request timed out — please try again.'
          : 'Could not reach the Gemini API. Check your connection.'
      );
    } finally {
      clearTimeout(timer);
    }
    // Model unavailable for this key? Try the fallback model.
    if (response.status === 404 && index < MODELS.length - 1) continue;
    break;
  }

  if (!response.ok) throw new Error(httpErrorHint(response.status));

  const data = await response.json();
  const jsonText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!jsonText) throw new Error('Gemini returned an empty response.');

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error('Gemini returned unparseable output.');
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Gemini returned an unexpected shape.');
  }
  return parsed;
}
