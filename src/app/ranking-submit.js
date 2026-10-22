/**
 * Saving the criterion weights: one create-only write to /rankings/{sessionId}.
 * Like rating-submit.js, a refusal because this session's record already
 * exists is resolved by reading the stored record back.
 */
import { get, ref, serverTimestamp, set } from 'firebase/database';
import { CRITERION_KEYS } from '../lib/criteria.js';
import { db } from '../lib/firebase.js';
import { DB_TIMEOUT_MS, isPermissionDenied, withTimeout } from './db-utils.js';

/** A queued write still lands later, so the participant is told after this. */
const WRITE_TIMEOUT_MS = 10000;

/**
 * Writes the allocation. When the rules refuse it because this session's
 * record already exists (a retry after a lost acknowledgement, or after a
 * write that timed out but still landed), the stored allocation counts as
 * saved: it is the one in the research data, so the caller should keep it.
 * @param {object} options
 * @param {string} options.sessionId
 * @param {string} options.uid
 * @param {string} options.userName
 * @param {string|null} options.room
 * @param {Record<string, number>} options.tokens
 * @returns {Promise<Record<string, number>>} the allocation stored in the database
 */
export async function submitRanking({ sessionId, uid, userName, room, tokens }) {
    const recordRef = ref(db, `rankings/${sessionId}`);
    const record = { ...tokens, userName, timestamp: serverTimestamp(), uid };
    if (room) record.room = room;
    try {
        await withTimeout(set(recordRef, record), WRITE_TIMEOUT_MS, 'Saving the weights');
        return tokens;
    } catch (error) {
        if (!isPermissionDenied(error)) throw error;
        const snapshot = await withTimeout(get(recordRef), DB_TIMEOUT_MS, 'Reading the weights');
        const existing = snapshot.val();
        if (existing?.uid !== uid) throw error;
        return Object.fromEntries(CRITERION_KEYS.map((key) => [key, existing[key]]));
    }
}
