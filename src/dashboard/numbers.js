/**
 * Number formatting for the dashboard. Statistics show two decimals so that
 * small differences between studies stay visible; missing values show a dash.
 */
import { MISSING, formatPercent } from '../lib/format.js';
import { formatNumber } from '../lib/i18n.js';

/**
 * A statistic such as a mean or SD, e.g. 3.456 -> '3.46'.
 * @param {number|null|undefined} value
 * @param {number} [digits]
 * @returns {string}
 */
export function formatStat(value, digits = 2) {
    if (!Number.isFinite(value)) return MISSING;
    return formatNumber(value, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/**
 * A whole-number count, e.g. 1284 -> '1,284'.
 * @param {number|null|undefined} value
 * @returns {string}
 */
export function formatCount(value) {
    return Number.isFinite(value) ? formatNumber(value) : MISSING;
}

/**
 * An expert rating: a whole number as it is, the average used for every
 * content version together as a statistic, e.g. 6 -> '6', 5.25 -> '5.25'.
 * @param {number|null|undefined} value
 * @returns {string}
 */
export function formatExpert(value) {
    return Number.isInteger(value) ? formatCount(value) : formatStat(value);
}

/**
 * A proportion as a percentage with one decimal, e.g. 0.2346 -> '23.5%'.
 * @param {number|null|undefined} value 0-1
 * @returns {string}
 */
export function formatShare(value) {
    return Number.isFinite(value) ? formatPercent(value * 100, { decimals: 1 }) : MISSING;
}
