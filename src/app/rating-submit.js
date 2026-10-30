/**
 * Saving one study's answers. The target is read and the rating written
 * before anything changes locally: the caller updates the score, the state
 * and the leaderboard only after `submitRating` resolves.
 */
import { get, ref, serverTimestamp, set } from 'firebase/database';
import { DB_TIMEOUT_MS, isPermissionDenied, withTimeout } from '../lib/db-utils.js';
import { db } from '../lib/firebase.js';
import { predictionScore, scoringTarget, targetRatings } from '../lib/scoring.js';
import { mean } from '../lib/stats.js';
import { buildRatingRecord } from './rating-record.js';

/**
 * Reads the study's ratings and works out the target from the other participants'
 * ratings of the current content version.
 * @param {object} study with id and expertRating
 * @param {string} sessionId
 * @returns {Promise<{target: number, crowd: {n: number, mean: number|null}}>}
 */
export async function readTarget(study, sessionId) {
    const snapshot = await withTimeout(
        get(ref(db, `ratings/${study.id}`)),
        DB_TIMEOUT_MS,
        'Reading the ratings'
    );
    const others = targetRatings(snapshot.val(), sessionId);
    const { target, n } = scoringTarget(others, study.expertRating);
    return { target, crowd: { n, mean: mean(others) } };
}

/**
 * Saves the answers. When the rules refuse the write because this session's
 * rating already exists (a retry after a lost acknowledgement, or a second
 * tab), the stored record is used instead.
 * @param {object} options
 * @param {object} options.study
 * @param {string} options.sessionId
 * @param {string} options.uid
 * @param {number} options.rating
 * @param {number} options.prediction
 * @param {number|null} options.responseTime
 * @param {number} options.trial
 * @param {string} options.locale
 * @param {string|null} options.room
 * @returns {Promise<{rating: number, prediction: number, score: number, target: number,
 *   crowd: {n: number, mean: number|null}|null}>}
 */
export async function submitRating({ study, sessionId, uid, rating, prediction, ...rest }) {
    const { target, crowd } = await readTarget(study, sessionId);
    const score = predictionScore(prediction, target);
    const recordRef = ref(db, `ratings/${study.id}/${sessionId}`);
    const record = buildRatingRecord({
        rating,
        prediction,
        uid,
        target,
        score,
        timestamp: serverTimestamp(),
        ...rest,
    });
    try {
        await set(recordRef, record);
        return { rating, prediction, score, target, crowd };
    } catch (error) {
        if (!isPermissionDenied(error)) throw error;
        const existing = (await get(recordRef)).val();
        if (!existing || existing.uid !== uid) throw error;
        const storedTarget = Number.isFinite(existing.target) ? existing.target : target;
        return {
            rating: existing.rating,
            prediction: existing.prediction,
            score: Number.isInteger(existing.score)
                ? existing.score
                : predictionScore(existing.prediction, storedTarget),
            target: storedTarget,
            // Only describe the target's make-up when it is the one just computed.
            crowd: storedTarget === target ? crowd : null,
        };
    }
}
