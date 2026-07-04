# 🧭 Safarnama — find your place in India's living culture

**Vertical:** Destination Discovery & Cultural Experiences.

*Safarnama* (Persian/Urdu: a travelogue) is a GenAI-powered travel companion
that turns one question — *"how do you travel?"* — into a culturally rich,
fully argued trip plan:

1. **Destination discovery** — every destination in the catalog is scored
   for *you* (interests, season, crowds, festivals, budget) and the top
   matches are presented with the *reasons* for every pick shown.
2. **A day-by-day cultural itinerary** — attractions clustered by zone so a
   day flows through one part of town, paced to your style, with the
   signature sight kept even for crowd-haters (timed to dodge the crush
   instead of deleted from your trip).
3. **Hidden gems** — places with high cultural reward and little footfall,
   surfaced by explicit thresholds and ranked for your interests.
4. **Immersive storytelling** — ✨ story mode asks Gemini to weave a
   second-person narrative *strictly from the fact-checked notes in the
   catalog*; every place also ships with a hand-written story, so
   storytelling works with no API key at all.
5. **Heritage, promoted honestly** — every destination carries a curated
   heritage summary, and every recommendation is explainable.
6. **Local events** — the festival calendar is matched to your travel
   month, with what you'll witness, how to show up respectfully, and an
   honest "dates shift with the lunar calendar" note. No festival that
   month? It says so — and tells you what's worth a return trip.
7. **Authentic cultural experiences** — craft workshops, food walks,
   performances, homestays and rituals, filtered by who you're traveling
   with, priced against your budget (above-budget ones are *flagged* as
   splurges, not hidden), each with an etiquette tip and **whom your money
   sustains**.

## Quick start

**Live demo:** https://tombro27.github.io/safarnama/

```bash
npm start        # zero dependencies — serves at http://localhost:8080
npm test         # unit + catalog-sanity tests via Node's built-in runner
```

Requires Node ≥ 18. Nothing to install; there is no build step.

## How the solution works

```
free text ──(optional Gemini call)──►┐
                                     ▼
structured form ────────────► normalizeContext()        js/engine/context.js
                                     │  validated, clamped traveler context
                                     ▼
                             rankDestinations()         js/engine/matcher.js
                                     │  affinity · season · crowds ·
                                     │  festival luck · cost, weights
                                     │  shifted by the traveler
                                     ▼   pick a destination
                             buildItinerary()           js/engine/itinerary.js
                                     │  select → cluster by zone → pace →
                                     │  evenings (festivals, experiences)
                                     ▼
              ┌──────────────┬───────┴────────┬─────────────────┐
              ▼              ▼                ▼                 ▼
        hiddenGems      festivalsIn     matchExperiences   ✨ story mode
        (gems.js)       (events.js)     (experiences.js)   (ai/storyteller.js)
```

### The decision logic (the interesting part)

- **Context-aware weights.** Destination scoring blends interest affinity,
  season fit, crowd fit, festival luck and relative cost — and the weights
  *shift with the traveler*: crowd-averse users trade festival chasing for
  quiet (crowd weight 0.10 → 0.25); on a shoestring budget the cost weight
  grows because price differences bite hardest there.
- **Interest affinity rewards excellence, not blandness** — 70% the average
  across your interests, 30% the single strongest match, so a city that is
  world-class at one thing you love beats one that is lukewarm at everything.
- **Season honesty.** Months are classified peak / shoulder / off against
  each destination's climate-honest best months (cyclically — December's
  neighbour is January). Off season is *stated in the reasons*, never hidden.
- **The anchor rule.** When a destination has a clear signature sight (a
  standout on all-India footfall), the itinerary always keeps it — a
  crowd-averse context doesn't delete the Meenakshi temple, it times the
  visit to dodge the crush (opening time, or the sight's own best hour) and
  says why. Places with no dominant sight simply lead with their best.
- **Hidden gems are a formula, not vibes**: popularity ≤ 0.4 on an all-India
  scale AND cultural value ≥ 0.7, ranked by cultural reward per unit of
  crowd, gems serving *your* interests first.
- **Zone clustering.** Selected attractions are grouped by neighbourhood
  zone and dealt into days — the signature sight's zone opens the trip, a
  day closes when its slots (2/3/4 by pace) or its humane hour-budget fill
  up, and a zone once left is never returned to.
- **Evenings are cultural programming.** Festivals falling in your month
  claim the first evenings; authentic experiences fill the rest — in-budget
  ones in interest-match order first, above-budget splurges only once
  nothing cheaper is left to schedule.
- **Mobility is a hard constraint with a soft voice**: step-free trips
  exclude inaccessible places from the *plan* and say which ones were
  skipped; the *discovery* sections still show them, flagged.
- **Deterministic by design.** Every ranking resolves ties with a stable
  chain ending in the place's name (destinations fall back to cost, gems and
  experiences to their own reward and price), so the same inputs always
  produce the same trip — inspectable, testable, impossible to fake.

### The GenAI layers

Two real Gemini integrations (`gemini-3.5-flash`, falling back to
`gemini-3.1-flash-lite`; JSON-schema-constrained; user-supplied key):

1. **Free-text trip parsing** — *"two of us, 5 days in November, old forts
   and street food, keep us away from crowds"* fills the same form the
   user could fill by hand, so both paths drive the identical engine.
2. **Grounded storytelling (✨ story mode)** — for any attraction or the
   whole city, Gemini writes a 150–220-word second-person narrative from
   the curated `facts` of that place **and nothing else** — the prompt
   forbids invented names, dates and legends. The catalog's facts were
   themselves fact-checked, so the stories stay honest.

Deliberate choices, identical to how we treat all AI:

- **Enhancement, never dependency.** Every feature works without a key —
  the form drives the engine; every place has a hand-written story.
- **No fabricated AI output, ever.** If a call fails (bad key, offline,
  rate-limited), the UI shows the real error and the app carries on.
- **Defense in depth**: schema-constrained responses are *still* passed
  through `normalizeContext()` (trip parsing) or type-checked (stories),
  so a malformed reply can never corrupt the app.
- The key is user-supplied at runtime, sent only to Google's endpoint,
  kept at most in the tab's session storage, and clearable with one click.
  It never appears in code, on a server of ours, or in the repository.

## Security notes

- Strict Content-Security-Policy (`default-src 'none'`; connections allowed
  only to the Gemini endpoint).
- No `innerHTML` anywhere — all rendering builds DOM nodes with text
  semantics (`js/ui/dom.js`), so user- or AI-supplied strings cannot inject
  markup.
- All inputs validated and clamped in one place (`normalizeContext`);
  unknown interests/enums are dropped, junk numbers fall back to defaults.
- `localStorage`/`sessionStorage` access is wrapped — corrupted or blocked
  storage degrades gracefully.
- The dev server whitelists MIME types, sends `X-Content-Type-Options:
  nosniff`, and blocks path traversal.

## Accessibility

Semantic landmarks and fieldsets, labels on every control, a skip link,
`aria-live` status regions, keyboard-operable throughout with visible focus,
dark-mode and reduced-motion support, honest text alternatives for every
badge, and a print stylesheet that outputs just the trip sheet to carry.
Step-free travel is a first-class input, not an afterthought.

## Project layout

```
index.html                 app shell (AI box + form + results skeleton)
css/styles.css             styles: light/dark, print trip sheet
js/app.js                  entry point — DOM wiring only, no business logic
js/engine/                 pure, tested decision logic (no DOM)
  context.js               input validation + defaults (the single gate)
  score.js                 shared scoring primitives (crowd fit, affinity)
  matcher.js               destination ranking with shifting weights
  itinerary.js             selection, zone clustering, pacing, evenings
  gems.js                  hidden-gem thresholds and ranking
  events.js                festival calendar matching (cyclic months)
  experiences.js           party/budget-aware experience matching
js/data/                   the curated catalog
  catalog.js               access layer + shape documentation
  destinations/*.js        one fact-checked entry per destination (12)
js/ai/                     the GenAI layer (all optional at runtime)
  client.js                schema-constrained Gemini calls, timeouts, errors
  tripParser.js            free text → structured context
  storyteller.js           grounded story generation (facts in, story out)
js/ui/                     rendering, split by view (no engine logic)
  dom.js · storage.js      safe builders, guarded storage
  aiBox.js · storyMode.js  the two GenAI surfaces
  matchesView.js · tripView.js · discoverView.js
tests/                     unit tests + catalog sanity (node --test)
server.mjs                 zero-dependency static server for npm start
```

## Assumptions

- **India-first by choice, not India-locked by design.** Deep, fact-checked
  coverage of one country beats shallow coverage of many: the storytelling
  layer is only as honest as the facts that ground it, and the engine's
  smartest behaviours (monsoon honesty, lunar-calendar festival drift,
  ₹-tier budgets, temple/gurdwara etiquette) come from domain depth.
  Nothing in `js/engine/` knows it is in India — going global is adding
  catalog files that conform to the schema in `js/data/catalog.js` and
  pass the same sanity tests.
- **The catalog is a curated sample, not a gazetteer**: 12 destinations
  across all six regions of India, ~115 attractions, 55+ experiences and
  35+ festivals — enough to make the decision logic real. Popularity,
  cultural value and cost figures are honest typical estimates (the app
  says so in its footer); entry costs are typical Indian-national tickets.
- **Festival months are typical months.** Most Indian festivals follow
  lunar calendars; the app always says "verify exact dates".
- `costPerDay` means per person, all-in (stay + food + local transport)
  for each budget tier; the trip estimate adds planned entry tickets and
  experience costs on top.
- A day holds 2 / 3 / 4 attraction slots (relaxed / balanced / packed)
  within a humane sightseeing-hour budget; evenings are planned separately.
- With no interests ticked, the app plans a rounded first encounter
  (history, food, folk life) rather than refusing to answer.
- The month field defaults to the current month on first visit; the last
  used context is remembered per browser (`localStorage`) and can be
  changed freely.

## Built with AI

Built through prompting with Claude Code as the AI coding platform. The
runtime AI integration (Gemini) is real, optional and documented above; the
destination catalog was curated with AI assistance and then fact-checked
entry by entry before being committed.
