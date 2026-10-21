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

/**
 * Runs `update` and restores focus to the equivalent element inside `container`.
 * @param {HTMLElement} container
 * @param {() => void} update synchronous DOM changes
 * @returns {void}
 */
export function preserveFocus(container, update) {
    const active = container.ownerDocument.activeElement;
    const keyed = active && container.contains(active) ? active.closest('[data-focus-key]') : null;
    const key = keyed?.dataset.focusKey;
    update();
    if (!key || container.ownerDocument.activeElement === keyed) return;
    const replacement = container.querySelector(`[data-focus-key="${escapeSelector(key)}"]`);
    replacement?.focus({ preventScroll: true });
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
