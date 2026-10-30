/**
 * The six rubric criteria, in the order used by the rubric, the study view,
 * the token allocator and the dashboard. `field` is the study property that
 * holds the criterion's text ('overview' is shown under the 'Theory' heading).
 * This module stays free of i18n so Node scripts can import it; translate the
 * keys from `labelKey` and `descriptionKey` with `t()`.
 */
import { TOKEN_BUDGET } from './config.js';

export const CRITERIA = Object.freeze([
    Object.freeze({ key: 'title', field: 'title', icon: '📰' }),
    Object.freeze({ key: 'access', field: 'access', icon: '📚' }),
    Object.freeze({ key: 'source', field: 'source', icon: '🏛️' }),
    Object.freeze({ key: 'theory', field: 'overview', icon: '🔬' }),
    Object.freeze({ key: 'methods', field: 'methods', icon: '📊' }),
    Object.freeze({ key: 'conclusion', field: 'conclusion', icon: '📝' }),
]);

export const CRITERION_KEYS = Object.freeze(CRITERIA.map(({ key }) => key));

/**
 * Translation key of a criterion's label, e.g. `t(labelKey('methods'))` gives 'Methods & Data'.
 * @param {string} key one of CRITERION_KEYS
 * @returns {string}
 */
export function labelKey(key) {
    return `common.criteria.${key}`;
}

/**
 * Translation key of a criterion's one-line description.
 * @param {string} key one of CRITERION_KEYS
 * @returns {string}
 */
export function descriptionKey(key) {
    return `common.criterionDescriptions.${key}`;
}

/**
 * True when an allocation gives every criterion an integer number of tokens
 * from 0 to TOKEN_BUDGET and the tokens add up to TOKEN_BUDGET. v1 only ever
 * wrote complete allocations, so this drops crafted entries and nothing genuine.
 * @param {unknown} entry a `/rankings/{sessionId}` value
 * @param {readonly string[]} [keys]
 * @returns {boolean}
 */
export function isValidAllocation(entry, keys = CRITERION_KEYS) {
    if (!entry || typeof entry !== 'object') return false;
    let total = 0;
    for (const key of keys) {
        const tokens = entry[key];
        if (!Number.isInteger(tokens) || tokens < 0 || tokens > TOKEN_BUDGET) return false;
        total += tokens;
    }
    return total === TOKEN_BUDGET;
}

/**
 * An allocation with every criterion at zero, for a participant who has not started.
 * @returns {Record<string, number>}
 */
export function emptyAllocation() {
    return Object.fromEntries(CRITERION_KEYS.map((key) => [key, 0]));
}
