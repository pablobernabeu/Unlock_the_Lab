/**
 * Live data for the dashboard: one read-only listener per database node, so a
 * change to /active (a heartbeat) never makes the page recompute ratings.
 * The dashboard never signs in and never writes.
 */
import { onValue, orderByChild, query, ref, startAt } from 'firebase/database';

/** Nodes the dashboard reads in full. */
export const DATA_NODES = Object.freeze(['ratings', 'leaderboard', 'rankings', 'active']);

/**
 * Subscribes to the dashboard's data.
 * @param {import('firebase/database').Database} db
 * @param {object} handlers
 * @param {(node: string, value: unknown) => void} handlers.onData called with each snapshot
 *   of ratings, leaderboard, rankings, active and sessions
 * @param {(node: string, error: Error) => void} handlers.onError a listener was refused or failed
 * @param {(connected: boolean) => void} handlers.onConnection
 * @param {(offsetMs: number) => void} handlers.onServerOffset server clock minus this device's clock
 * @returns {() => void} unsubscribes everything
 */
export function subscribe(db, { onData, onError, onConnection, onServerOffset }) {
    const listen = (name, target) =>
        onValue(
            target,
            (snapshot) => onData(name, snapshot.val()),
            (error) => onError(name, error)
        );

    const unsubscribers = DATA_NODES.map((name) => listen(name, ref(db, name)));
    // Sessions only supply room codes, so only sessions that have one are fetched
    // (string values sort after null, so startAt('') skips sessions without a room).
    unsubscribers.push(
        listen('sessions', query(ref(db, 'sessions'), orderByChild('room'), startAt('')))
    );
    unsubscribers.push(
        onValue(ref(db, '.info/connected'), (snapshot) => onConnection(snapshot.val() === true)),
        onValue(ref(db, '.info/serverTimeOffset'), (snapshot) =>
            onServerOffset(Number(snapshot.val()) || 0)
        )
    );
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}
