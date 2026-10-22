/**
 * Keeps /leaderboard/{sessionId} in step with the participant's totals.
 * Writes go one study at a time (see leaderboard-plan.js) and are serialised,
 * so overlapping calls never race. Nothing here is an error for the
 * participant, so problems are logged quietly:
 *   - v1 entries without a uid, or owned by another uid, are frozen by the
 *     rules, so the app stops trying for this page;
 *   - an entry ahead of this browser, or a refused write, usually means
 *     another tab of the same session has moved the entry on. The next sync
 *     reads the entry again and carries on once the local totals catch up.
 */
import { get, ref, serverTimestamp, set } from 'firebase/database';
import { DB_TIMEOUT_MS, withTimeout } from '../lib/db-utils.js';
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
    /** The stored entry as last read or written; undefined when unknown. */
    let stored;
    let frozen = false;
    let chain = Promise.resolve();

    async function readStored() {
        const snapshot = await withTimeout(get(entryRef), DB_TIMEOUT_MS, 'Reading the leaderboard');
        return snapshot.exists() ? snapshot.val() : null;
    }

    async function writeSteps() {
        const local = getLocal();
        if (frozen || local.papersRated === 0) return;
        if (!local.uid || !USERNAME_PATTERN.test(local.userName ?? '')) return;

        if (stored === undefined) stored = await readStored();
        if (stored && stored.uid !== local.uid) {
            frozen = true;
            console.info(
                '[leaderboard] The stored entry belongs to another uid or to v1; not updating it.'
            );
            return;
        }
        const steps = planLeaderboardSteps(stored, local);
        if (steps === null) {
            stored = undefined;
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
            stored = { ...entry, timestamp: null };
        }
    }

    /**
     * Brings the entry up to date. Never rejects.
     * @returns {Promise<void>}
     */
    function sync() {
        chain = chain.then(() =>
            writeSteps().catch((error) => {
                // The next sync reads the entry again rather than trusting a value that may not have landed.
                stored = undefined;
                console.info('[leaderboard] Update not saved:', error?.message ?? error);
            })
        );
        return chain;
    }

    return { sync };
}
