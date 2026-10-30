/**
 * How precisely to show a scoring target. The score uses the exact target, so
 * a target rounded to two decimals can, near a half point, give a score one
 * point away from the one shown (target 1.125 shown as 1.13: a prediction of
 * 2 scores 89, but 1.13 would give 90). Pure, so it can be unit-tested.
 */
import { predictionScore } from '../lib/scoring.js';

/** Fewest and most decimals a target is shown with. */
export const MIN_TARGET_DIGITS = 2;
export const MAX_TARGET_DIGITS = 6;

const formats = new Map();

/**
 * `value` rounded to `digits` decimals as Intl.NumberFormat shows it (halves
 * away from zero), which is how the app formats numbers in every locale.
 * @param {number} value
 * @param {number} digits
 * @returns {number}
 */
export function roundTarget(value, digits) {
    if (!formats.has(digits)) {
        formats.set(
            digits,
            new Intl.NumberFormat('en', { useGrouping: false, maximumFractionDigits: digits })
        );
    }
    return Number(formats.get(digits).format(value));
}

/**
 * The fewest decimals (2 to 6) with which the scoring rule, applied to the
 * target as shown, gives `score`. Two unless the score is unknown or two
 * decimals would mislead.
 * @param {number} target
 * @param {number|null|undefined} prediction
 * @param {number|null|undefined} score
 * @returns {number}
 */
export function targetDigits(target, prediction, score) {
    if (!Number.isFinite(target) || !Number.isFinite(prediction) || !Number.isInteger(score)) {
        return MIN_TARGET_DIGITS;
    }
    for (let digits = MIN_TARGET_DIGITS; digits <= MAX_TARGET_DIGITS; digits += 1) {
        if (predictionScore(prediction, roundTarget(target, digits)) === score) return digits;
    }
    return MIN_TARGET_DIGITS;
}
