/**
 * Small view helpers shared by the participant app's views.
 */
import { el, focusHeading, qsa } from '../lib/dom.js';
import { t } from '../lib/i18n.js';

/**
 * An element whose content is trusted HTML from our own content or locale
 * files (a few inline tags such as <i> and <strong>). Never pass database values.
 * @param {string} tag
 * @param {Record<string, unknown>|null} attrs
 * @param {string} html
 * @returns {HTMLElement}
 */
export function trustedHtml(tag, attrs, html) {
    const element = el(tag, attrs);
    element.innerHTML = html;
    return element;
}

/**
 * A coloured badge for a quality band, always with its text label.
 * @param {'low'|'medium'|'high'|null} band
 * @param {string} text
 * @returns {HTMLElement}
 */
export function bandBadge(band, text) {
    return el('span', { class: ['badge', band && `badge--${band}`] }, text);
}

/**
 * Shows one view and hides the others.
 * @param {string} id the view element's id, e.g. 'view-study'
 * @returns {HTMLElement|null} the view
 */
export function showView(id) {
    let shown = null;
    for (const view of qsa('.view')) {
        view.hidden = view.id !== id;
        if (view.id === id) shown = view;
    }
    const loading = document.getElementById('app-loading');
    if (loading) loading.hidden = true;
    return shown;
}

/**
 * Sets the document title for a view.
 * @param {string} page translated page name
 * @returns {void}
 */
export function setPageTitle(page) {
    document.title = t('app.documentTitle', { page });
}

/**
 * Moves focus to a view's main heading after navigation and scrolls to the top.
 * @param {HTMLElement|null} view
 * @returns {void}
 */
export function focusView(view) {
    window.scrollTo(0, 0);
    focusHeading(view?.querySelector('h1') ?? null);
}

/**
 * True while any modal dialog is open (toasts would sit behind it).
 * @returns {boolean}
 */
export function dialogOpen() {
    return document.querySelector('dialog[open]') !== null;
}

/**
 * Closes every open dialog (their promises resolve as cancelled).
 * @returns {void}
 */
export function closeOpenDialogs() {
    for (const dialog of qsa('dialog[open]')) dialog.close();
}

/**
 * Marks a button as unavailable while keeping it focusable, so its reason
 * (given in nearby text) can still be reached.
 * @param {HTMLButtonElement} button
 * @param {boolean} unavailable
 * @returns {void}
 */
export function setUnavailable(button, unavailable) {
    if (unavailable) button.setAttribute('aria-disabled', 'true');
    else button.removeAttribute('aria-disabled');
}

/**
 * @param {HTMLButtonElement} button
 * @returns {boolean} true when marked unavailable with setUnavailable
 */
export function isUnavailable(button) {
    return button.getAttribute('aria-disabled') === 'true';
}

const boundOnce = new WeakMap();

/**
 * Adds a listener to a static element (part of index.html) only once, however
 * often its view is rendered. A later call replaces the handler.
 * @param {HTMLElement|null} element
 * @param {string} type
 * @param {(event: Event) => void} handler
 * @returns {void}
 */
export function bindOnce(element, type, handler) {
    if (!element) return;
    const handlers = boundOnce.get(element) ?? new Map();
    if (!handlers.has(type)) {
        element.addEventListener(type, (event) => handlers.get(type)?.(event));
    }
    handlers.set(type, handler);
    boundOnce.set(element, handlers);
}

/**
 * Replaces an element's children, skipping null, undefined and false
 * (replaceChildren itself would insert them as the text 'null').
 * @param {Element} parent
 * @param {...(Node|string|null|undefined|false)} children
 * @returns {void}
 */
export function setChildren(parent, ...children) {
    parent.replaceChildren(
        ...children.filter((child) => child !== null && child !== undefined && child !== false)
    );
}
