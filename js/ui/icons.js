/**
 * Bespoke inline-SVG icon set.
 *
 * Icons are built as real SVG DOM nodes (createElementNS), never via
 * innerHTML — the app's no-innerHTML rule holds even for our own markup.
 * Every icon is a 24×24 line glyph that inherits `currentColor`, so it
 * takes on the vibrant accent of whatever card it sits in and themes
 * correctly in light and dark.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Each icon is a list of primitive shapes. A shape is [tag, attrs]; attrs
 * with `fill: 'solid'` become filled glyphs, everything else is stroked.
 */
const ICONS = {
  // ── Interests ──────────────────────────────────────────────
  history: [
    ['polyline', { points: '3,9 12,3 21,9' }],
    ['line', { x1: 7, y1: 9, x2: 7, y2: 18 }],
    ['line', { x1: 12, y1: 9, x2: 12, y2: 18 }],
    ['line', { x1: 17, y1: 9, x2: 17, y2: 18 }],
    ['line', { x1: 4, y1: 21, x2: 20, y2: 21 }],
  ],
  architecture: [
    ['path', { d: 'M4 21v-8a8 8 0 0 1 16 0v8' }],
    ['line', { x1: 12, y1: 2, x2: 12, y2: 5 }],
    ['line', { x1: 3, y1: 21, x2: 21, y2: 21 }],
  ],
  food: [
    ['path', { d: 'M3 12h18a9 9 0 0 1-18 0Z' }],
    ['path', { d: 'M8 3c-1 1.5 1 2.5 0 4' }],
    ['path', { d: 'M12 2.5c-1 1.5 1 2.5 0 4' }],
    ['path', { d: 'M16 3c-1 1.5 1 2.5 0 4' }],
  ],
  crafts: [
    ['circle', { cx: 12, cy: 13, r: 7 }],
    ['path', { d: 'M7 9c4 2 6 6 8 10' }],
    ['path', { d: 'M9.5 6.5c3 1.5 6 5 7.5 9' }],
    ['path', { d: 'M5.5 12c3 1 5 3.5 6.5 7' }],
  ],
  spiritual: [
    ['path', { d: 'M12 3c-2 3-2 5 0 7 2-2 2-4 0-7Z', fill: 'solid' }],
    ['path', { d: 'M5 13q7 5 14 0' }],
    ['path', { d: 'M7 16q5 3 10 0' }],
  ],
  performing: [
    ['circle', { cx: 7, cy: 18, r: 2.4, fill: 'solid' }],
    ['circle', { cx: 17, cy: 16, r: 2.4, fill: 'solid' }],
    ['line', { x1: 9.2, y1: 18, x2: 9.2, y2: 7 }],
    ['line', { x1: 19.2, y1: 16, x2: 19.2, y2: 5 }],
    ['line', { x1: 9.2, y1: 7, x2: 19.2, y2: 5 }],
  ],
  nature: [
    ['circle', { cx: 17, cy: 7, r: 2.5 }],
    ['polyline', { points: '3,20 9,10 13,16 17,11 21,20' }],
  ],
  folk: [
    ['circle', { cx: 8.5, cy: 8, r: 2.6 }],
    ['path', { d: 'M4 20v-2a4.5 4.5 0 0 1 9 0v2' }],
    ['circle', { cx: 16, cy: 9.5, r: 2.1 }],
    ['path', { d: 'M14 20v-2.5a3.6 3.6 0 0 1 6.5-2' }],
  ],
  // ── Markers ────────────────────────────────────────────────
  gem: [
    ['path', { d: 'M6 3h12l3 6-9 12L3 9Z' }],
    ['path', { d: 'M3 9h18' }],
    ['path', { d: 'M9 3 7 9l5 12' }],
    ['path', { d: 'M15 3l2 6-5 12' }],
  ],
  festival: [
    ['line', { x1: 12, y1: 3, x2: 12, y2: 7 }],
    ['line', { x1: 12, y1: 17, x2: 12, y2: 21 }],
    ['line', { x1: 3, y1: 12, x2: 7, y2: 12 }],
    ['line', { x1: 17, y1: 12, x2: 21, y2: 12 }],
    ['line', { x1: 5.6, y1: 5.6, x2: 8.5, y2: 8.5 }],
    ['line', { x1: 15.5, y1: 15.5, x2: 18.4, y2: 18.4 }],
    ['line', { x1: 18.4, y1: 5.6, x2: 15.5, y2: 8.5 }],
    ['line', { x1: 8.5, y1: 15.5, x2: 5.6, y2: 18.4 }],
    ['circle', { cx: 12, cy: 12, r: 2.4, fill: 'solid' }],
  ],
  pin: [
    ['path', { d: 'M12 21s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12Z' }],
    ['circle', { cx: 12, cy: 9, r: 2.5 }],
  ],
  clock: [
    ['circle', { cx: 12, cy: 12, r: 8.5 }],
    ['polyline', { points: '12,7 12,12 16,14' }],
  ],
};

/** Which interest/marker glyph represents each attraction/experience kind. */
export const KIND_ICON = {
  monument: 'history',
  temple: 'spiritual',
  museum: 'history',
  market: 'folk',
  neighbourhood: 'folk',
  nature: 'nature',
  food: 'food',
  craft: 'crafts',
  workshop: 'crafts',
  performance: 'performing',
  stay: 'folk',
  walk: 'nature',
  ritual: 'spiritual',
};

/**
 * Build an icon as an inline SVG element.
 *
 * @param {string} name key in ICONS (unknown names render nothing visible)
 * @param {{size?: number, className?: string, title?: string}} [opts]
 * @returns {SVGElement}
 */
export function icon(name, { size = 20, className = '', title } = {}) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.9');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('class', `icon ${className}`.trim());
  // Decorative by default; a title makes it a labelled graphic.
  if (title) {
    svg.setAttribute('role', 'img');
    const t = document.createElementNS(SVG_NS, 'title');
    t.textContent = title;
    svg.append(t);
  } else {
    svg.setAttribute('aria-hidden', 'true');
  }

  for (const [tag, attrs] of ICONS[name] ?? []) {
    const shape = document.createElementNS(SVG_NS, tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (key === 'fill' && value === 'solid') {
        shape.setAttribute('fill', 'currentColor');
        shape.setAttribute('stroke', 'none');
      } else {
        shape.setAttribute(key, String(value));
      }
    }
    svg.append(shape);
  }
  return svg;
}

/** A chip: an interest icon plus its label, for card metadata rows. */
export function iconChip(name, label) {
  const chip = document.createElement('span');
  chip.className = 'icon-chip';
  chip.append(icon(name, { size: 16 }), document.createTextNode(label));
  return chip;
}
