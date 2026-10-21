/**
 * Locale-aware display formatting for scores, ratings and durations.
 * Missing values display as an en dash.
 */
import { formatNumber } from './i18n.js';

export const MISSING = '–';

/**
 * Formats a percentage given on a 0-100 scale, e.g. 87.4 -> '87%'.
 * Rounds before formatting so the result agrees with Math.round, which the
 * leaderboard uses for ranking ties.
 * @param {number | null | undefined} value
 * @param {object} [options]
 * @param {number} [options.decimals]
 * @returns {string}
 */
export function formatPercent(value, { decimals = 0 } = {}) {
    if (!Number.isFinite(value)) return MISSING;
    const factor = 10 ** decimals;
    const rounded = Math.round(value * factor) / factor;
    return formatNumber(rounded / 100, {
        style: 'percent',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
}

/**
 * Formats a rating or mean rating with one decimal, e.g. 3.456 -> '3.5'.
 * @param {number | null | undefined} value
 * @returns {string}
 */
export function formatRating(value) {
    if (!Number.isFinite(value)) return MISSING;
    return formatNumber(value, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function unit(value, name) {
    return formatNumber(value, { style: 'unit', unit: name, unitDisplay: 'short' });
}

/** '2 min 5 sec', or just '2 min' when the smaller unit is zero. */
function twoUnits([major, majorUnit], [minor, minorUnit]) {
    return minor > 0
        ? `${unit(major, majorUnit)} ${unit(minor, minorUnit)}`
        : unit(major, majorUnit);
}

/**
 * Formats a duration, e.g. 45000 -> '45 sec', 125000 -> '2 min 5 sec',
 * 3720000 -> '1 hr 2 min'.
 * @param {number | null | undefined} ms
 * @returns {string}
 */
export function formatDuration(ms) {
    if (!Number.isFinite(ms) || ms < 0) return MISSING;
    const totalSeconds = Math.round(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) return twoUnits([hours, 'hour'], [minutes, 'minute']);
    if (minutes > 0) return twoUnits([minutes, 'minute'], [seconds, 'second']);
    return unit(seconds, 'second');
}
