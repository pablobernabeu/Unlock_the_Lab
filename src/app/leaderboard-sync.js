/**
 * Keeps /leaderboard/{sessionId} in step with the participant's totals.
 * Writes go one study at a time (see leaderboard-plan.js) and are serialised,
 * so overlapping calls never race. Each sync starts from the entry as stored
 * now, not as this page last wrote it, because another tab of the same
 * session may have moved it on. Nothing here is an error for the participant,
 * so problems are logged quietly:
 *   - v1 entries without a uid, or owned by another uid, are frozen by the
 *     rules, so the app stops trying for this page;
 *   - an entry ahead of this browser is left as it is until the local totals
 *     catch up (the next sync, after the next rating, reads it again);
 *   - a refused write is followed by a fresh read and a new plan, once.
 */
import { get, ref, serverTimestamp, set } from 'firebase/database';
import { DB_TIMEOUT_MS, isPermissionDenied, withTimeout } from '../lib/db-utils.js';
import { db } from '../lib/firebase.js';
import { USERNAME_PATTERN } from '../lib/patterns.js';
import { planLeaderboardSteps } from './leaderboard-plan.js';

/**
 * @param {object} options
 * @param {string} options.sessionId
 * @param {() => {uid: string|null, userName: string|null, room: string|null,
 *   score: number, papersRated: number}} options.getLocal current totals and identity
 */
export function createLeaderboardSync({ sessionId, getLocal }) {
    const entryRef = ref(db, `leaderboard/${sessionId}`);
    let frozen = false;
    let chain = Promise.resolve();

    async function readStored() {
        const snapshot = await withTimeout(get(entryRef), DB_TIMEOUT_MS, 'Reading the leaderboard');
        return snapshot.exists() ? snapshot.val() : null;
    }

    /** One pass: read the entry, plan the steps from it and write them. */
    async function writeSteps(local) {
        const stored = await readStored();
        if (stored && stored.uid !== local.uid) {
            frozen = true;
            console.info(
                '[leaderboard] The stored entry belongs to another uid or to v1; not updating it.'
            );
            return;
        }
        const steps = planLeaderboardSteps(stored, local);
        if (steps === null) {
            console.info(
                '[leaderboard] The stored entry is ahead of this browser; not updating it yet.'
            );
            return;
        }
        for (const step of steps) {
            const entry = {
                score: step.score,
                papersRated: step.papersRated,
                timestamp: serverTimestamp(),
                uid: local.uid,
                userName: local.userName,
            };
            if (local.room) entry.room = local.room;
            await set(entryRef, entry);
        }
    }

    async function update() {
        const local = getLocal();
        if (frozen || local.papersRated === 0) return;
        if (!local.uid || !USERNAME_PATTERN.test(local.userName ?? '')) return;
        try {
            await writeSteps(local);
        } catch (error) {
            if (!isPermissionDenied(error)) throw error;
            // Usually another tab of this session wrote first: plan again from what it stored.
            console.info('[leaderboard] Update refused; reading the entry again.');
            await writeSteps(getLocal());
        }
    }

    /**
     * Brings the entry up to date. Never rejects.
     * @returns {Promise<void>}
     */
    function sync() {
        chain = chain.then(() =>
            update().catch((error) => {
                console.info('[leaderboard] Update not saved:', error?.message ?? error);
            })
        );
        return chain;
    }

    return { sync };
}
