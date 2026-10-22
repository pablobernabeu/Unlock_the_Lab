/**
 * Small DOM helpers. Database-derived strings must reach the page through
 * textContent, `el()` children or `escapeHtml`, never through raw innerHTML.
 */

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/**
 * Escapes text for use inside HTML markup or a quoted attribute.
 * @param {unknown} value null and undefined become ''
 * @returns {string}
 */
export function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

/**
 * Creates an element.
 *
 *   el('button', { class: 'btn btn-primary', type: 'button', onClick: start }, 'Start')
 *
 * Attributes: `class`, `dataset` (object), `style` (string), `text` (textContent),
 * `on<Event>` functions (added with addEventListener), booleans (true adds an
 * empty attribute, false omits it) and anything else via setAttribute.
 * null and undefined are skipped. Children may be nodes, strings, numbers or
 * nested arrays; strings become text nodes.
 * @param {string} tag
 * @param {Record<string, unknown> | null} [attrs]
 * @param {...unknown} children
 * @returns {HTMLElement}
 */
export function el(tag, attrs, ...children) {
    const element = document.createElement(tag);
    for (const [name, value] of Object.entries(attrs ?? {})) {
        setAttribute(element, name, value);
    }
    append(element, children);
    return element;
}

function setAttribute(element, name, value) {
    if (value === null || value === undefined || value === false) return;
    if (name === 'class' || name === 'className') {
        element.className = Array.isArray(value) ? value.filter(Boolean).join(' ') : value;
    } else if (name === 'dataset') {
        Object.assign(element.dataset, value);
    } else if (name === 'text') {
        element.textContent = value;
    } else if (/^on/i.test(name)) {
        // Functions become listeners; anything else would be an inline handler, which we never write.
        if (typeof value === 'function')
            element.addEventListener(name.slice(2).toLowerCase(), value);
    } else if (value === true) {
        element.setAttribute(name, '');
    } else {
        element.setAttribute(name, String(value));
    }
}

function append(parent, children) {
    for (const child of children.flat(Infinity)) {
        if (child === null || child === undefined || child === false) continue;
        parent.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
}

/**
 * querySelector shorthand.
 * @param {string} selector
 * @param {ParentNode} [root]
 * @returns {Element | null}
 */
export function qs(selector, root = document) {
    return root.querySelector(selector);
}

/**
 * querySelectorAll as an array.
 * @param {string} selector
 * @param {ParentNode} [root]
 * @returns {Element[]}
 */
export function qsa(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
}

/**
 * Sets an element's text, accepting an element or a selector.
 * @param {Element | string | null} target
 * @param {unknown} text
 * @returns {Element | null} the element, or null when not found
 */
export function setText(target, text) {
    const element = typeof target === 'string' ? qs(target) : target;
    if (element) element.textContent = String(text ?? '');
    return element;
}

/**
 * Moves focus to a heading (or other non-interactive element) after a view
 * change, making it focusable without adding it to the tab order.
 * @param {HTMLElement | null} element
 * @returns {void}
 */
export function focusHeading(element) {
    if (!element) return;
    if (!element.hasAttribute('tabindex')) element.setAttribute('tabindex', '-1');
    element.focus();
}

const liveRegions = new Map();
const pendingAnnouncements = new Map();

function liveRegion(politeness) {
    const existing = liveRegions.get(politeness);
    if (existing?.isConnected) return existing;
    const region = el('div', {
        class: 'visually-hidden',
        'aria-live': politeness,
        'aria-atomic': 'true',
        dataset: { liveRegion: politeness },
    });
    document.body.append(region);
    liveRegions.set(politeness, region);
    return region;
}

/**
 * Adds the shared live regions to the page. Call it at start-up: some screen
 * readers ignore the first message written to a region created at that moment.
 * @returns {void}
 */
export function ensureLiveRegions() {
    liveRegion('polite');
    liveRegion('assertive');
}

/**
 * Announces a message to screen readers through a shared, visually hidden live region.
 * @param {string} message
 * @param {'polite' | 'assertive'} [politeness]
 * @returns {void}
 */
export function announce(message, politeness = 'polite') {
    const level = politeness === 'assertive' ? 'assertive' : 'polite';
    const region = liveRegion(level);
    // Clearing first and writing on the next tick makes repeated messages announce again.
    // A message still waiting is dropped when a newer one arrives, so only the latest is read.
    clearTimeout(pendingAnnouncements.get(level));
    region.textContent = '';
    pendingAnnouncements.set(
        level,
        setTimeout(() => {
            pendingAnnouncements.delete(level);
            region.textContent = message;
        }, 50)
    );
}
