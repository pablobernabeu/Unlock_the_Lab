/**
 * Keeps keyboard focus in place while live updates rebuild or reorder part of
 * the page. Focusable elements that may be replaced or moved carry a
 * `data-focus-key`; after the update, focus returns to the element with the
 * same key if the browser dropped it.
 */

function escapeSelector(value) {
    return typeof globalThis.CSS?.escape === 'function'
        ? globalThis.CSS.escape(value)
        : String(value).replace(/["\\]/g, '\\$&');
}

/** True when focus has nowhere useful to be: on the body, or on an element now removed or hidden. */
function focusLost(doc, element) {
    return (
        !element ||
        element === doc.body ||
        !element.isConnected ||
        Boolean(element.closest('[hidden]'))
    );
}

/**
 * Runs `update` and restores focus to the equivalent element inside `container`.
 * When that element is gone (its row left the list), focus moves to `fallback`
 * rather than dropping to the top of the page.
 * @param {HTMLElement} container
 * @param {() => void} update synchronous DOM changes
 * @param {object} [options]
 * @param {() => HTMLElement|null|undefined} [options.fallback]
 * @returns {void}
 */
export function preserveFocus(container, update, { fallback } = {}) {
    const doc = container.ownerDocument;
    const active = doc.activeElement;
    const hadFocus = !focusLost(doc, active) && container.contains(active);
    const keyed = hadFocus ? active.closest('[data-focus-key]') : null;
    const key = keyed?.dataset.focusKey;
    update();
    if (!hadFocus) return;
    if (doc.activeElement === active && !focusLost(doc, active)) return;
    const replacement = key
        ? container.querySelector(`[data-focus-key="${escapeSelector(key)}"]`)
        : null;
    if (replacement) {
        replacement.focus({ preventScroll: true });
    } else if (focusLost(doc, doc.activeElement) || focusLost(doc, active)) {
        fallback?.()?.focus({ preventScroll: true });
    }
}

/**
 * Puts keyed children of `parent` in the given order, moving only when the
 * order differs (moving a node can drop focus, so callers wrap this in preserveFocus).
 * @param {HTMLElement} parent
 * @param {HTMLElement[]} ordered every child that should remain, in order
 * @returns {void}
 */
export function syncChildren(parent, ordered) {
    const wanted = new Set(ordered);
    for (const child of [...parent.children]) {
        if (!wanted.has(child)) child.remove();
    }
    const current = [...parent.children];
    const same =
        current.length === ordered.length &&
        current.every((child, index) => child === ordered[index]);
    if (!same) parent.append(...ordered);
}
