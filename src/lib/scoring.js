/**
 * Prediction scoring, as in v1. A prediction is scored against a target that
 * blends the other participants' ratings with the expert rating counted as
 * SEED_WEIGHT participants:
 *
 *   target = (sum of other ratings + expertRating × SEED_WEIGHT) / (n + SEED_WEIGHT)
 *   score  = max(0, 100 − round(SCORE_PENALTY × |prediction − target|))
 *
 * The participant's own rating is never part of their target.
 */
import { RATING_MAX, RATING_MIN, SCORE_PENALTY, SEED_WEIGHT } from './config.js';

/** v1 fell back to the scale midpoint when a study had no expert rating. */
const SCALE_MIDPOINT = (RATING_MIN + RATING_MAX) / 2;

/**
 * True for a finite number on the 1-7 scale.
 * @param {unknown} value
 * @returns {value is number}
 */
export function isValidRating(value) {
    return Number.isFinite(value) && value >= RATING_MIN && value <= RATING_MAX;
}

/**
 * Extracts usable ratings from a `/ratings/{studyId}` node. Entries may be
 * `{rating, ...}` objects or, in very old data, bare numbers.
 * @param {Record<string, unknown> | null | undefined} node
 * @param {string} [excludeKey] session id to leave out (the participant's own rating)
 * @returns {number[]}
 */
export function validRatings(node, excludeKey) {
    if (!node || typeof node !== 'object') return [];
    return Object.entries(node)
        .filter(([key]) => key !== excludeKey)
        .map(([, entry]) => (typeof entry === 'number' ? entry : entry?.rating))
        .filter(isValidRating);
}

/**
 * The value a prediction is scored against.
 * @param {number[] | Record<string, unknown> | null} otherRatings ratings by other
 *   participants, as an array or a raw ratings node
 * @param {number} expertRating 1-7
 * @param {number} [weight] how many participants the expert rating counts as
 * @returns {{target: number, n: number}} `n` is the number of participant ratings used
 */
export function scoringTarget(otherRatings, expertRating, weight = SEED_WEIGHT) {
    const ratings = Array.isArray(otherRatings)
        ? otherRatings.filter(isValidRating)
        : validRatings(otherRatings);
    const expert = isValidRating(expertRating) ? expertRating : SCALE_MIDPOINT;
    const n = ratings.length;
    if (n === 0) return { target: expert, n };

    const sum = ratings.reduce((total, rating) => total + rating, 0);
    return { target: (sum + expert * weight) / (n + weight), n };
}

/**
 * Points for one prediction: 100 for an exact hit, minus SCORE_PENALTY per scale point of error.
 * @param {number} prediction 1-7
 * @param {number} target
 * @returns {number} integer 0-100
 */
export function predictionScore(prediction, target) {
    const difference = Math.abs(prediction - target);
    return Math.max(0, 100 - Math.round(difference * SCORE_PENALTY));
}

/**
 * Mean points per rated study (the accuracy shown as a percentage).
 * @param {number} score summed prediction points
 * @param {number} papersRated
 * @returns {number | null} null when nothing has been rated
 */
export function meanAccuracy(score, papersRated) {
    if (!Number.isFinite(score) || !(papersRated > 0)) return null;
    return score / papersRated;
}

/**
 * The whole-number percentage displayed for an accuracy (v1 used Math.round).
 * @param {number} score
 * @param {number} papersRated
 * @returns {number | null}
 */
export function displayedAccuracy(score, papersRated) {
    const mean = meanAccuracy(score, papersRated);
    return mean === null ? null : Math.round(mean);
}

/**
 * Score bands used for feedback messages, best first. v1 chose its messages by
 * prediction error (0, 0.5, 1, 1.5 and 2.5 points); these are the corresponding
 * scores, so the message always agrees with the score shown next to it.
 */
export const SCORE_BANDS = Object.freeze([
    { band: 'perfect', min: 100 },
    { band: 'outstanding', min: 94 },
    { band: 'excellent', min: 88 },
    { band: 'great', min: 82 },
    { band: 'good', min: 70 },
    { band: 'keepLearning', min: 0 },
]);

/**
 * Message band for a per-study score.
 * @param {number} score 0-100
 * @returns {'perfect'|'outstanding'|'excellent'|'great'|'good'|'keepLearning'}
 */
export function scoreBand(score) {
    return SCORE_BANDS.find(({ min }) => score >= min)?.band ?? 'keepLearning';
}
