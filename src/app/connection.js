/**
 * The participant's link to the database, set up in the order the rules need:
 *
 *   1. anonymous sign-in (retried, with a clear failure state),
 *   2. the create-only /sessions/{sessionId} record that binds the session to
 *      this uid (another uid's record means the session is claimed; a missing
 *      record for a session that had joined means its data were deleted),
 *   3. presence under /active/{sessionId}: written on every (re)connection with
 *      onDisconnect().remove(), plus a heartbeat that only updates lastActive,
 *   4. a listener on /control/sessionsEndedAt, the facilitator's 'end all sessions'.
 *
 * Steps 3 and 4 are started by the app once the session is ready.
 */
import {
    get,
    goOffline,
    goOnline,
    onDisconnect,
    onValue,
    ref,
    remove,
    serverTimestamp,
    set,
    update,
} from 'firebase/database';
import {
    APP_VERSION,
    CONTENT_VERSION,
    FEEDBACK_MODE,
    PRESENCE_HEARTBEAT_MS,
} from '../lib/config.js';
import { db, getParticipantAuth } from '../lib/firebase.js';
import { getLocale } from '../lib/i18n.js';
import { DB_TIMEOUT_MS, isPermissionDenied, retry, withTimeout } from './db-utils.js';

/** Waits before the second and third sign-in attempts. */
const SIGN_IN_RETRY_DELAYS_MS = [1500, 4000];
const REMOVE_TIMEOUT_MS = 5000;

/** Why the session cannot be used. */
export class ConnectionError extends Error {
    /**
     * @param {'failed'|'claimed'|'closed'} kind
     * @param {unknown} [cause]
     */
    constructor(kind, cause) {
        super(`Connection ${kind}`, { cause });
        this.name = 'ConnectionError';
        this.kind = kind;
    }
}

/**
 * True when the facilitator ended all sessions after this session joined.
 * @param {unknown} endedAt /control/sessionsEndedAt (server clock)
 * @param {unknown} joinedAt the session's join time (server clock)
 * @returns {boolean}
 */
export function endedAfterJoin(endedAt, joinedAt) {
    return Number.isFinite(endedAt) && Number.isFinite(joinedAt) && endedAt > joinedAt;
}

function quietly(context) {
    return (error) => console.info(`[connection] ${context}:`, error?.message ?? error);
}

async function signInAnonymouslyOnce() {
    const auth = await getParticipantAuth();
    await auth.authStateReady();
    const { signInAnonymously, signOut } = await import('firebase/auth');
    // A v1 admin sign-in may persist on the default app; participant writes must use an anonymous uid.
    if (auth.currentUser && !auth.currentUser.isAnonymous) await signOut(auth);
    if (!auth.currentUser) await signInAnonymously(auth);
    return auth.currentUser;
}

function serverTimeOffset() {
    return new Promise((resolve) => {
        const stop = onValue(
            ref(db, '.info/serverTimeOffset'),
            (snapshot) => {
                queueMicrotask(() => stop());
                resolve(Number(snapshot.val()) || 0);
            },
            () => resolve(0)
        );
    });
}

/**
 * Creates the connection manager for one session.
 * @param {object} options
 * @param {string} options.sessionId
 * @param {string|null} options.room
 * @param {() => number|null} options.getJoinedAt the session's join time (server clock)
 * @param {(ms: number) => void} options.setJoinedAt saves the join time on first connection
 * @param {(status: 'connecting'|'ready'|'failed'|'claimed'|'closed') => void} [options.onStatus]
 */
export function createConnection({
    sessionId,
    room,
    getJoinedAt,
    setJoinedAt,
    onStatus = () => {},
}) {
    const activeRef = ref(db, `active/${sessionId}`);
    let status = 'idle';
    let uid = null;
    let pending = null;
    let presenceOn = false;
    let stopConnectedListener = null;
    let heartbeat = null;
    let stopControlListener = null;
    let offline = false;

    function setStatus(next) {
        status = next;
        onStatus(next);
    }

    /**
     * Makes sure /sessions/{sessionId} exists and belongs to this uid.
     * @returns {Promise<boolean|'deleted'>} false when another uid owns it
     */
    async function ensureSessionRecord() {
        const sessionRef = ref(db, `sessions/${sessionId}`);
        const readRecord = () => withTimeout(get(sessionRef), DB_TIMEOUT_MS, 'Reading the session');
        const snapshot = await readRecord();
        if (snapshot.exists()) return snapshot.child('uid').val() === uid;
        // The join time is only saved once the record exists, so a missing record was deleted
        // (the facilitator's 'Delete data'). Writing it again would bring back data that is gone.
        if (Number.isFinite(getJoinedAt())) return 'deleted';
        const record = {
            uid,
            createdAt: serverTimestamp(),
            contentVersion: CONTENT_VERSION,
            appVersion: APP_VERSION,
            locale: getLocale(),
            feedbackMode: FEEDBACK_MODE,
        };
        if (room) record.room = room;
        try {
            await withTimeout(set(sessionRef, record), DB_TIMEOUT_MS, 'Creating the session');
            return true;
        } catch (error) {
            if (!isPermissionDenied(error)) throw error;
            // A create retried after a lost acknowledgement is refused although the record is
            // ours. A refusal because another uid owns the leaderboard or rankings entry leaves
            // no record, or someone else's.
            const existing = await readRecord();
            return existing.child('uid').val() === uid;
        }
    }

    async function establish() {
        setStatus('connecting');
        try {
            const user = await retry(signInAnonymouslyOnce, SIGN_IN_RETRY_DELAYS_MS);
            uid = user.uid;
            const owned = await ensureSessionRecord();
            if (owned === 'deleted') {
                setStatus('closed');
                throw new ConnectionError('closed');
            }
            if (!owned) {
                setStatus('claimed');
                throw new ConnectionError('claimed');
            }
            if (!Number.isFinite(getJoinedAt()))
                setJoinedAt(Date.now() + (await serverTimeOffset()));
            setStatus('ready');
            return { uid };
        } catch (error) {
            if (error instanceof ConnectionError) throw error;
            console.warn('[connection] Could not connect:', error);
            setStatus('failed');
            throw new ConnectionError('failed', error);
        }
    }

    /**
     * Connects (or reconnects after a failure). Concurrent callers share one attempt.
     * @returns {Promise<{uid: string}>} rejects with a ConnectionError
     */
    function whenReady() {
        if (status === 'ready') return Promise.resolve({ uid });
        if (status === 'claimed' || status === 'closed') {
            return Promise.reject(new ConnectionError(status));
        }
        pending ??= establish().finally(() => {
            pending = null;
        });
        return pending;
    }

    function presenceRecord() {
        const record = { joinedAt: serverTimestamp(), lastActive: serverTimestamp(), uid };
        if (room) record.room = room;
        return record;
    }

    async function announcePresence() {
        await onDisconnect(activeRef).remove();
        // Presence may have been stopped while the onDisconnect request was in flight.
        if (presenceOn) await set(activeRef, presenceRecord());
    }

    /** Starts presence and the heartbeat. Needs a ready connection. */
    function startPresence() {
        if (presenceOn || status !== 'ready') return;
        presenceOn = true;
        // Runs on every (re)connection, because onDisconnect removes the entry after a network blip.
        stopConnectedListener = onValue(ref(db, '.info/connected'), (snapshot) => {
            if (snapshot.val() === true && presenceOn) {
                announcePresence().catch(quietly('presence'));
            }
        });
        heartbeat = setInterval(() => {
            update(activeRef, { lastActive: serverTimestamp() }).catch(quietly('heartbeat'));
        }, PRESENCE_HEARTBEAT_MS);
    }

    /**
     * Stops the heartbeat and removes the presence entry.
     * @returns {Promise<void>}
     */
    async function stopPresence() {
        const wasOn = presenceOn;
        presenceOn = false;
        stopConnectedListener?.();
        stopConnectedListener = null;
        clearInterval(heartbeat);
        heartbeat = null;
        if (wasOn && !offline) {
            await withTimeout(remove(activeRef), REMOVE_TIMEOUT_MS, 'Removing presence').catch(
                quietly('remove presence')
            );
        }
    }

    /**
     * Calls `onEnded` when the facilitator ends all sessions after this session joined.
     * @param {() => void} onEnded
     */
    function watchControl(onEnded) {
        if (stopControlListener) return;
        stopControlListener = onValue(
            ref(db, 'control/sessionsEndedAt'),
            (snapshot) => {
                if (endedAfterJoin(snapshot.val(), getJoinedAt())) onEnded();
            },
            quietly('control listener')
        );
    }

    function stopWatchingControl() {
        stopControlListener?.();
        stopControlListener = null;
    }

    /** The pause in progress; resume() clears it so a pause still removing presence stops there. */
    let pauseRequest = null;

    /**
     * Pauses after inactivity: presence goes and the connection closes.
     * @returns {Promise<void>}
     */
    async function pause() {
        const request = {};
        pauseRequest = request;
        await stopPresence();
        // Continue was pressed while presence was being removed, which can take up to
        // REMOVE_TIMEOUT_MS on a stale socket (a laptop waking from sleep).
        if (pauseRequest !== request) return;
        pauseRequest = null;
        offline = true;
        goOffline(db);
    }

    /** Resumes the same session after a pause, including one that has not finished pausing. */
    function resume() {
        pauseRequest = null;
        if (offline) {
            offline = false;
            goOnline(db);
        }
        // Written after the pending removal, which the server applies first.
        startPresence();
    }

    /** Marks the session as closed by the facilitator: no further writes. */
    async function close() {
        stopWatchingControl();
        await stopPresence();
        setStatus('closed');
    }

    return {
        whenReady,
        startPresence,
        stopPresence,
        watchControl,
        stopWatchingControl,
        pause,
        resume,
        close,
        get uid() {
            return uid;
        },
        get status() {
            return status;
        },
    };
}
