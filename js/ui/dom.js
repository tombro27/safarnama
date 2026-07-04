/**
 * Safe DOM builders shared by every view.
 *
 * Rendering builds real nodes with textContent semantics — there is no
 * innerHTML anywhere in the app, so user- or AI-supplied strings can never
 * inject markup.
 */

/**
 * Create an element.
 *
 * @param {string} tag
 * @param {object} [attrs] 'class' sets className; 'onclick' etc. attach
 *   listeners; everything else becomes an attribute. Null/undefined skipped.
 * @param {Array|Node|string} [children] strings become text nodes
 * @returns {HTMLElement}
 */
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined) continue;
    if (key === 'class') node.className = value;
    else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2), value);
    } else node.setAttribute(key, value);
  }
  for (const child of [].concat(children)) {
    if (child === null || child === undefined) continue;
    node.append(typeof child === 'object' && child.nodeType ? child : String(child));
  }
  return node;
}

/** A <ul class="reasons"> of plain-text reasons. */
export function reasonList(reasons) {
  return el('ul', { class: 'reasons' }, reasons.map((r) => el('li', {}, r)));
}

/** ₹ formatting, Indian grouping. */
export function rupees(amount) {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

/** Replace a container's children and return it. */
export function fill(container, children) {
  container.replaceChildren(...[].concat(children).filter(Boolean));
  return container;
}
