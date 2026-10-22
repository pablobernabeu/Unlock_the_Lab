/**
 * The criterion token allocator's arithmetic: each participant shares
 * TOKEN_BUDGET tokens between the six criteria. Pure functions; the view
 * (views/weights.js) renders the result.
 */
import { TOKEN_BUDGET } from '../lib/config.js';
import { CRITERION_KEYS } from '../lib/criteria.js';

/**
 * Tokens allocated so far.
 * @param {Record<string, number>} tokens criterion -> tokens
 * @returns {number}
 */
export function tokensUsed(tokens) {
    return CRITERION_KEYS.reduce((total, key) => total + (tokens?.[key] ?? 0), 0);
}

/**
 * The most tokens a criterion can hold given what the others already hold.
 * @param {Record<string, number>} tokens
 * @param {string} key
 * @param {number} [budget]
 * @returns {number}
 */
export function maxTokensFor(tokens, key, budget = TOKEN_BUDGET) {
    return budget - (tokensUsed(tokens) - (tokens?.[key] ?? 0));
}

/**
 * Sets a criterion's tokens, clamped to 0 and to what the budget leaves.
 * @param {Record<string, number>} tokens
 * @param {string} key
 * @param {number} count
 * @param {number} [budget]
 * @returns {Record<string, number>} a new allocation (the same object when nothing changed)
 */
export function setTokens(tokens, key, count, budget = TOKEN_BUDGET) {
    if (!CRITERION_KEYS.includes(key) || !Number.isFinite(count)) return tokens;
    const clamped = Math.max(0, Math.min(Math.trunc(count), maxTokensFor(tokens, key, budget)));
    if (clamped === tokens[key]) return tokens;
    return { ...tokens, [key]: clamped };
}

/**
 * True when every token has been allocated.
 * @param {Record<string, number>} tokens
 * @param {number} [budget]
 * @returns {boolean}
 */
export function allocationComplete(tokens, budget = TOKEN_BUDGET) {
    return tokensUsed(tokens) === budget;
}
