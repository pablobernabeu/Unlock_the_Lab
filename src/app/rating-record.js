/**
 * The shape of a v2 rating record. Pure, so it can be unit-tested without Firebase.
 */
import { CONTENT_VERSION, FEEDBACK_MODE, STUDY_COUNT } from '../lib/config.js';

/**
 * The record stored at /ratings/{studyId}/{sessionId}, with every v2 field.
 * @param {object} answer
 * @param {number} answer.rating 1-7
 * @param {number} answer.prediction 1-7
 * @param {number|null} answer.responseTime ms; omitted when unknown
 * @param {unknown} answer.timestamp the server timestamp placeholder
 * @param {string} answer.uid
 * @param {number} answer.target 1-7, the value the prediction was scored against
 * @param {number} answer.score 0-100
 * @param {number} answer.trial 1-based position in the participant's sequence
 * @param {string} answer.locale
 * @param {string|null} answer.room
 * @returns {object}
 */
export function buildRatingRecord({
    rating,
    prediction,
    responseTime,
    timestamp,
    uid,
    target,
    score,
    trial,
    locale,
    room,
}) {
    const record = {
        rating,
        prediction,
        timestamp,
        uid,
        contentVersion: CONTENT_VERSION,
        feedbackShown: FEEDBACK_MODE === 'each',
        target,
        score,
        trial: Math.min(Math.max(trial, 1), STUDY_COUNT),
        locale,
    };
    if (Number.isFinite(responseTime) && responseTime >= 0) record.responseTime = responseTime;
    if (room) record.room = room;
    return record;
}
