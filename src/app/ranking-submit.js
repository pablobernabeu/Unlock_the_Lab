/**
 * Saving the criterion weights: one create-only write to /rankings/{sessionId}.
 * Like rating-submit.js, a refusal because this session's record already
 * exists is resolved by reading the stored record back.
 */
import { get, ref, serverTimestamp, set } from 'firebase/database';
import { CRITERION_KEYS } from '../lib/criteria.js';
import { DB_TIMEOUT_MS, isPermissionDenied, withTimeout } from '../lib/db-utils.js';
import { db } from '../lib/firebase.js';

/** A queued write still lands later, so the participant is told after this. */
const WRITE_TIMEOUT_MS = 10000;

/**
 * Writes the allocation. When the rules refuse it because a record for this
 * session already exists, the stored record decides what happens:
 *   - 'saved': the write succeeded;
 *   - 'kept': the stored record is this uid's own (a retry after a lost
 *     acknowledgement, or after a write that timed out but still landed). It
 *     is the allocation in the research data, so the caller should keep it;
 *   - 'earlier': the stored record has no uid (saved by version 1) or another
 *     uid's, so it can never be replaced. The caller keeps the new
 *     allocation on this device only.
 * @param {object} options
 * @param {string} options.sessionId
 * @param {string} options.uid
 * @param {string} options.userName
 * @param {string|null} options.room
 * @param {Record<string, number>} options.tokens
 * @returns {Promise<{status: 'saved'|'kept'|'earlier', tokens: Record<string, number>}>}
 *   `tokens` is the allocation the participant should see
 */
export async function submitRanking({ sessionId, uid, userName, room, tokens }) {
    const recordRef = ref(db, `rankings/${sessionId}`);
    const record = { ...tokens, userName, timestamp: serverTimestamp(), uid };
    if (room) record.room = room;
    try {
        await withTimeout(set(recordRef, record), WRITE_TIMEOUT_MS, 'Saving the weights');
        return { status: 'saved', tokens };
    } catch (error) {
        if (!isPermissionDenied(error)) throw error;
        const snapshot = await withTimeout(get(recordRef), DB_TIMEOUT_MS, 'Reading the weights');
        const existing = snapshot.val();
        if (!existing) throw error;
        if (existing.uid !== uid) return { status: 'earlier', tokens };
        return {
            status: 'kept',
            tokens: Object.fromEntries(CRITERION_KEYS.map((key) => [key, existing[key]])),
        };
    }
}
