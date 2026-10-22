/**
 * The participant session's lifecycle on top of connection.js: sign-in and
 * the session record, the nickname, presence, the inactivity warning and
 * pause, the facilitator's 'end all sessions' and the leaderboard catch-up.
 * The app calls `start` when the participant leaves the welcome page (or at
 * load when resuming), `finish` on the results page and `end` before
 * starting a new participant.
 */
import { get, ref } from 'firebase/database';
import { INACTIVITY_TIMEOUT_MS, INACTIVITY_WARNING_MS } from '../lib/config.js';
import { db } from '../lib/firebase.js';
import { USERNAME_PATTERN } from '../lib/patterns.js';
import { generateUniqueUsername, generateUsername } from '../lib/username.js';
import { ConnectionError, createConnection } from './connection.js';
import { withTimeout } from './db-utils.js';
import { createInactivityMonitor } from './inactivity.js';
import { createLeaderboardSync } from './leaderboard-sync.js';
import { ratedCount } from './state.js';

const READ_TIMEOUT_MS = 10000;

/**
 * A nickname for this session: the one already stored for it on the
 * leaderboard (a resumed v1 session), otherwise a new one not yet in use.
 * @param {string} sessionId
 * @returns {Promise<string>}
 */
async function chooseUsername(sessionId) {
    try {
        const snapshot = await withTimeout(
            get(ref(db, 'leaderboard')),
            READ_TIMEOUT_MS,
            'Reading nicknames'
        );
        const node = snapshot.val() ?? {};
        const own = node[sessionId]?.userName;
        if (typeof own === 'string' && USERNAME_PATTERN.test(own)) return own;
        const names = Object.values(node)
            .map((entry) => entry?.userName)
            .filter((name) => typeof name === 'string');
        return generateUniqueUsername(names);
    } catch (error) {
        // v1 also fell back to an unchecked name; a clash only matters for name look-ups.
        console.info('[session] Nickname check skipped:', error?.message ?? error);
        return generateUsername();
    }
}

/**
 * @param {object} options
 * @param {() => object} options.getState
 * @param {(changes: object) => void} options.patch
 * @param {(kind: 'failed'|'claimed') => void} options.onProblem
 * @param {() => void} options.onConnected clears earlier problems
 * @param {() => void} options.onClosed the facilitator ended the session
 * @param {() => void} options.onWarning inactivity warning is due
 * @param {() => void} options.onPaused the session has paused after inactivity
 * @param {() => void} options.onUserName the nickname is known
 */
export function createSession({
    getState,
    patch,
    onProblem,
    onConnected,
    onClosed,
    onWarning,
    onPaused,
    onUserName,
}) {
    const { sessionId, room } = getState();
    const connection = createConnection({
        sessionId,
        room,
        getJoinedAt: () => getState().joinedAt,
        setJoinedAt: (joinedAt) => patch({ joinedAt }),
    });
    const leaderboard = createLeaderboardSync({
        sessionId,
        getLocal: () => {
            const state = getState();
            return {
                uid: connection.uid,
                userName: state.userName,
                room: state.room,
                score: state.totalScore,
                papersRated: ratedCount(state),
            };
        },
    });
    const monitor = createInactivityMonitor({
        timeoutMs: INACTIVITY_TIMEOUT_MS,
        warningMs: INACTIVITY_WARNING_MS,
        onWarning,
        onTimeout: () => pause(),
    });
    /** 'idle' | 'starting' | 'active' | 'paused' | 'finished' | 'closed' */
    let phase = 'idle';
    let wantPresence = false;

    let naming = null;

    /** Gives the session a nickname if it has none (once, however often it is called). */
    function ensureUsername() {
        if (USERNAME_PATTERN.test(getState().userName ?? '')) return Promise.resolve();
        naming ??= chooseUsername(sessionId).then((userName) => {
            patch({ userName });
            onUserName();
        });
        return naming;
    }

    async function endedByFacilitator() {
        try {
            const snapshot = await withTimeout(
                get(ref(db, 'control/sessionsEndedAt')),
                READ_TIMEOUT_MS,
                'Reading the session control'
            );
            const endedAt = snapshot.val();
            const { joinedAt } = getState();
            return Number.isFinite(endedAt) && Number.isFinite(joinedAt) && endedAt > joinedAt;
        } catch {
            // The listener started below catches an ending that this read missed.
            return false;
        }
    }

    function close() {
        if (phase === 'closed') return;
        phase = 'closed';
        monitor.stop();
        connection.close().catch(() => {});
        onClosed();
    }

    function activate() {
        if (phase === 'closed' || phase === 'finished') return;
        phase = 'active';
        connection.startPresence();
        connection.watchControl(close);
        monitor.start();
    }

    /**
     * Connects and, when `presence` is true, joins the presence list. Safe to call again
     * (for example from a 'Try again' button); a session that is already running only
     * gains presence when asked for.
     * @param {object} [options]
     * @param {boolean} [options.presence]
     * @returns {Promise<void>}
     */
    async function start({ presence = true } = {}) {
        wantPresence = wantPresence || presence;
        if (phase === 'closed' || phase === 'paused') return;
        if (phase === 'active') return;
        if (phase === 'finished' && !presence) return;
        if (phase === 'starting') return;
        phase = 'starting';
        try {
            await connection.whenReady();
            onConnected();
            await ensureUsername();
            if (await endedByFacilitator()) {
                close();
                return;
            }
            leaderboard.sync();
            if (wantPresence) activate();
            else phase = 'finished';
        } catch (error) {
            phase = 'idle';
            if (error instanceof ConnectionError && error.kind !== 'closed') onProblem(error.kind);
            else console.warn('[session] Could not start:', error);
        }
    }

    function pause() {
        if (phase !== 'active') return;
        phase = 'paused';
        monitor.stop();
        connection.pause().catch(() => {});
        onPaused();
    }

    /** Resumes after the pause: presence, heartbeat and the inactivity countdown restart. */
    function resume() {
        if (phase !== 'paused') return;
        phase = 'active';
        connection.resume();
        monitor.start();
    }

    /**
     * The participant has reached the results page: no presence, no timers.
     * Saved answers can still bring the leaderboard up to date.
     */
    function finish() {
        wantPresence = false;
        if (phase === 'active' || phase === 'paused') {
            monitor.stop();
            connection.stopWatchingControl();
            if (phase === 'paused') connection.resume();
            connection.stopPresence().catch(() => {});
            phase = 'finished';
        }
    }

    /**
     * Stops everything before the browser's session is cleared.
     * @returns {Promise<void>}
     */
    async function end() {
        monitor.stop();
        connection.stopWatchingControl();
        await connection.stopPresence().catch(() => {});
        phase = 'closed';
    }

    /**
     * The connection for writes. A session whose start failed earlier finishes
     * starting (nickname, presence) once a write gets through.
     * @returns {Promise<{uid: string}>} rejects with a ConnectionError
     */
    async function whenReady() {
        if (phase === 'closed') throw new ConnectionError('closed');
        const ready = await connection.whenReady();
        if (phase === 'idle') start({ presence: wantPresence });
        return ready;
    }

    return {
        start,
        finish,
        end,
        resume,
        ensureUsername,
        /** Restarts the inactivity countdown (the warning's Continue button). */
        keepAlive: () => monitor.reset(),
        /** Brings the leaderboard entry up to date with the saved answers. Never rejects. */
        syncLeaderboard: () => (phase === 'closed' ? Promise.resolve() : leaderboard.sync()),
        whenReady,
        get closed() {
            return phase === 'closed';
        },
    };
}
