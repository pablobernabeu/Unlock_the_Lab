/**
 * Keeps /leaderboard/{sessionId} in step with the participant's totals.
 * Writes go one study at a time (see leaderboard-plan.js) and are serialised,
 * so overlapping calls never race. A refused write is not an error for the
 * participant: v1 entries without a uid, or owned by another uid, are frozen
 * by the rules, so the app logs it quietly and stops trying for this page.
 */
import { get, ref, serverTimestamp, set } from 'firebase/database';
import { db } from '../lib/firebase.js';
import { USERNAME_PATTERN } from '../lib/patterns.js';
import { isPermissionDenied, withTimeout } from './db-utils.js';
import { planLeaderboardSteps } from './leaderboard-plan.js';

const READ_TIMEOUT_MS = 15000;

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
        const snapshot = await withTimeout(
            get(entryRef),
            READ_TIMEOUT_MS,
            'Reading the leaderboard'
        );
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
            frozen = true;
            console.info(
                '[leaderboard] The stored entry is ahead of this browser; not updating it.'
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
                if (isPermissionDenied(error)) frozen = true;
                console.info('[leaderboard] Update not saved:', error?.message ?? error);
            })
        );
        return chain;
    }

    return { sync };
}
