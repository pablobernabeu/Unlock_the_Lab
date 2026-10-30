/**
 * Holds the latest value of each database node the admin panel watches and
 * tells the panels about changes, at most once per animation frame however
 * many nodes changed. No Firebase or DOM, so it can be unit-tested.
 */

/**
 * @param {object} [options]
 * @param {(callback: () => void) => void} [options.schedule] defaults to requestAnimationFrame
 */
export function createStore({ schedule = (callback) => requestAnimationFrame(callback) } = {}) {
    let values = {};
    let loaded = new Set();
    const listeners = new Set();
    let scheduled = false;

    function notify() {
        if (scheduled) return;
        scheduled = true;
        schedule(() => {
            scheduled = false;
            for (const listener of listeners) listener();
        });
    }

    return {
        /**
         * Records a node's latest value.
         * @param {string} name e.g. 'ratings' or 'connected'
         * @param {unknown} value
         */
        set(name, value) {
            values[name] = value;
            loaded.add(name);
            notify();
        },
        /**
         * @param {string} name
         * @returns {unknown} the latest value, or undefined before the first one
         */
        get(name) {
            return values[name];
        },
        /**
         * True once every named node has had a value.
         * @param {...string} names
         * @returns {boolean}
         */
        has(...names) {
            return names.every((name) => loaded.has(name));
        },
        /** @returns {Record<string, unknown>} the latest values, keyed by node name */
        values() {
            return { ...values };
        },
        /**
         * Calls `listener` after changes.
         * @param {() => void} listener
         * @returns {() => void} unsubscribes
         */
        subscribe(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        /** Forgets every value (after sign-out) and tells the listeners. */
        clear() {
            values = {};
            loaded = new Set();
            notify();
        },
    };
}
