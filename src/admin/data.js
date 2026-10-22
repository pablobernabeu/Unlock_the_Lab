/**
 * Database access for the admin panel. Live data and writes go through the
 * named 'admin' Firebase app (src/lib/firebase.js createAdminApp), so they run
 * with the administrator's sign-in and never touch a participant's anonymous
 * user. Exports and the delete counts read over REST instead (see rest.js).
 */
import { get, onValue, ref, serverTimestamp, update } from 'firebase/database';
import { firebaseConfig } from '../lib/firebase-config.js';
import { DATABASE_EMULATOR_PORT, EMULATOR_HOST, usingEmulators } from '../lib/firebase.js';
import { DELETED_NODES } from './counts.js';
import { withTimeout } from './errors.js';
import { fetchNode, restBaseUrl } from './rest.js';

/** Nodes the panel watches live. */
export const LIVE_NODES = Object.freeze([...DELETED_NODES]);

/** How long a read or write may take before the panel reports it. */
export const REQUEST_TIMEOUT_MS = 15000;

/** Store key for the time of the last 'end all sessions'. */
export const ENDED_AT = 'sessionsEndedAt';

/**
 * True when this uid is listed under /admins. The rules let each account read
 * only its own entry, so this is the same check the rules apply to writes.
 * @param {import('firebase/database').Database} db
 * @param {string} uid
 * @returns {Promise<boolean>}
 */
export async function isAdmin(db, uid) {
    const snapshot = await withTimeout(get(ref(db, `admins/${uid}`)), REQUEST_TIMEOUT_MS);
    return snapshot.val() === true;
}

/**
 * Keeps `store` up to date with the watched nodes, the time sessions were last
 * ended, the connection state ('connected') and the server clock offset
 * ('serverOffset', server time minus this device's time).
 * @param {import('firebase/database').Database} db
 * @param {ReturnType<import('./store.js').createStore>} store
 * @param {(error: Error) => void} onError a listener was refused or failed
 * @returns {() => void} stops watching
 */
export function watchData(db, store, onError) {
    const watch = (path, name, read = (snapshot) => snapshot.val()) =>
        onValue(ref(db, path), (snapshot) => store.set(name, read(snapshot)), onError);
    const stops = [
        ...LIVE_NODES.map((name) => watch(name, name)),
        watch(`control/${ENDED_AT}`, ENDED_AT),
        watch('.info/connected', 'connected', (snapshot) => snapshot.val() === true),
        watch('.info/serverTimeOffset', 'serverOffset', (snapshot) => Number(snapshot.val()) || 0),
    ];
    return () => stops.forEach((stop) => stop());
}

const REST_BASE = restBaseUrl({
    databaseURL: firebaseConfig.databaseURL,
    emulatorOrigin: usingEmulators
        ? `http://${EMULATOR_HOST}:${DATABASE_EMULATOR_PORT}`
        : undefined,
});

/**
 * Reads nodes afresh from the server, over REST as the daily backup does, so
 * that a file or a count never comes from the SDK's copy (see rest.js).
 * @param {readonly string[]} names e.g. ['ratings', 'leaderboard']
 * @returns {Promise<Record<string, unknown>>} values keyed by node name (null when empty)
 */
export async function readNodes(names) {
    const values = await withTimeout(
        Promise.all(names.map((name) => fetchNode(REST_BASE, name))),
        REQUEST_TIMEOUT_MS
    );
    return Object.fromEntries(names.map((name, index) => [name, values[index]]));
}

/**
 * Ends every session that started before now: records the server time in
 * /control/sessionsEndedAt, which open workshop pages listen to, and clears
 * the presence list. Both changes are made together or not at all.
 * @param {import('firebase/database').Database} db
 * @returns {Promise<void>}
 */
export function endAllSessions(db) {
    return update(ref(db), { [`control/${ENDED_AT}`]: serverTimestamp(), active: null });
}

/**
 * Removes ratings, leaderboard, rankings, sessions and the presence list in
 * one atomic update: either all of them go or none does.
 * @param {import('firebase/database').Database} db
 * @returns {Promise<void>}
 */
export function deleteParticipantData(db) {
    return update(ref(db), Object.fromEntries(DELETED_NODES.map((name) => [name, null])));
}
