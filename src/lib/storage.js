/**
 * localStorage access that never throws. Browsers with storage blocked (school
 * devices, some in-app browsers, 'block all cookies') throw on any access; the
 * workshop must keep working there, so values that cannot be persisted are
 * kept in memory for the lifetime of the page.
 */

const memory = new Map();

function storageArea() {
    try {
        return globalThis.localStorage ?? null;
    } catch {
        return null;
    }
}

/**
 * Reads a string value.
 * @param {string} key
 * @param {string|null} [fallback] returned when the key is missing or unreadable
 * @returns {string|null}
 */
export function safeGet(key, fallback = null) {
    // The in-memory copy only holds values that could not be persisted, so it is newer.
    if (memory.has(key)) return memory.get(key);
    try {
        return storageArea()?.getItem(key) ?? fallback;
    } catch {
        return fallback;
    }
}

/**
 * Stores a string value.
 * @param {string} key
 * @param {string} value
 * @returns {boolean} true when it reached localStorage, false when only kept in memory
 */
export function safeSet(key, value) {
    let text;
    try {
        // String() itself throws for some values, such as Object.create(null).
        text = String(value);
        const area = storageArea();
        if (area) {
            area.setItem(key, text);
            memory.delete(key);
            return true;
        }
    } catch {
        // Quota exceeded or storage blocked: keep the value for this page.
    }
    if (typeof text === 'string') memory.set(key, text);
    return false;
}

/**
 * Removes a value.
 * @param {string} key
 * @returns {boolean} true when localStorage was updated
 */
export function safeRemove(key) {
    memory.delete(key);
    try {
        const area = storageArea();
        if (!area) return false;
        area.removeItem(key);
        return true;
    } catch {
        return false;
    }
}

/**
 * Reads and parses a JSON value.
 * @template T
 * @param {string} key
 * @param {T} [fallback] returned when missing, unreadable or not valid JSON
 * @returns {T | unknown}
 */
export function safeGetJSON(key, fallback = null) {
    const text = safeGet(key);
    if (text === null) return fallback;
    try {
        return JSON.parse(text);
    } catch {
        return fallback;
    }
}

/**
 * Serialises and stores a JSON value.
 * @param {string} key
 * @param {unknown} value
 * @returns {boolean} true when it reached localStorage
 */
export function safeSetJSON(key, value) {
    let text;
    try {
        text = JSON.stringify(value);
    } catch {
        return false;
    }
    // undefined and functions have no JSON form; storing 'undefined' would only read back as the fallback.
    if (text === undefined) return false;
    return safeSet(key, text);
}

/**
 * True when values survive a reload (localStorage is writable).
 * @returns {boolean}
 */
export function storageAvailable() {
    const probe = '__utl_probe__';
    try {
        const area = storageArea();
        if (!area) return false;
        area.setItem(probe, probe);
        area.removeItem(probe);
        return true;
    } catch {
        return false;
    }
}
