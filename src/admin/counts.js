/**
 * Counts for the admin panel: the overview figures, the export table and the
 * delete confirmation. Pure functions over raw database nodes (no Firebase,
 * no DOM). They accept legacy records: ratings stored as bare numbers, and
 * entries without uid, room or timestamps.
 */
import { ACTIVE_WINDOW_MS, MIN_STUDIES_TO_FINISH, STUDY_COUNT } from '../lib/config.js';
import { STUDY_ID_PATTERN } from '../lib/patterns.js';
import { isValidRating } from '../lib/scoring.js';

/** Nodes that hold participant data, in the order the panel lists them. */
export const PARTICIPANT_NODES = Object.freeze(['ratings', 'leaderboard', 'rankings', 'sessions']);

/** Nodes that 'Delete participant data' removes: participant data plus the presence list. */
export const DELETED_NODES = Object.freeze([...PARTICIPANT_NODES, 'active']);

/** What the person types to confirm a deletion when no participant has any data. */
export const DELETE_WORD = 'DELETE';

function isObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * [key, value] pairs of a node. Firebase returns a node whose keys are all
 * small integers as an array (possible in legacy data), so arrays count too,
 * without their empty slots.
 */
function entriesOf(node) {
    if (Array.isArray(node)) return Object.entries(node).filter(([, value]) => value != null);
    return isObject(node) ? Object.entries(node) : [];
}

/**
 * True for the ids of the workshop's studies (STUDY-1 to STUDY-48), the ones
 * the dashboard shows. The rules accept ids up to STUDY-99.
 * @param {string} studyId
 * @returns {boolean}
 */
export function isWorkshopStudy(studyId) {
    if (!STUDY_ID_PATTERN.test(studyId)) return false;
    return Number(studyId.slice(studyId.indexOf('-') + 1)) <= STUDY_COUNT;
}

/**
 * [sessionId, record] pairs of a node. Ratings are nested by study, so a
 * session appears once per study it rated; the other nodes are keyed by session.
 * @param {string} name node name, e.g. 'ratings'
 * @param {unknown} node
 * @returns {Array<[string, unknown]>}
 */
function sessionRecords(name, node) {
    if (name !== 'ratings') return entriesOf(node);
    return entriesOf(node).flatMap(([, study]) => entriesOf(study));
}

/**
 * Number of records stored in a node, valid or not, counted as the backup
 * script counts them: ratings per study and session, other nodes per key.
 * @param {string} name e.g. 'ratings' or 'leaderboard'
 * @param {unknown} node the node's value (null when empty)
 * @returns {number}
 */
export function recordCount(name, node) {
    return sessionRecords(name, node).length;
}

/**
 * Headline figures from `/ratings`, counted as the public dashboard counts
 * them: only ratings on the 1-7 scale for one of the workshop's studies.
 * @param {unknown} node `/ratings`
 * @param {object} [options]
 * @param {number} [options.minStudies] rated studies needed to count as completed
 * @returns {{participants: number, ratings: number, completed: number}}
 *   participants: sessions with at least one rating
 */
export function ratingCounts(node, { minStudies = MIN_STUDIES_TO_FINISH } = {}) {
    const perSession = new Map();
    let ratings = 0;
    for (const [studyId, study] of entriesOf(node)) {
        if (!isWorkshopStudy(studyId)) continue;
        for (const [sessionId, record] of entriesOf(study)) {
            const rating = typeof record === 'number' ? record : record?.rating;
            if (!isValidRating(rating)) continue;
            ratings += 1;
            perSession.set(sessionId, (perSession.get(sessionId) ?? 0) + 1);
        }
    }
    const completed = [...perSession.values()].filter((count) => count >= minStudies).length;
    return { participants: perSession.size, ratings, completed };
}

/**
 * Presence entries in `/active`: all of them, and those whose last heartbeat
 * falls within the active window (the dashboard's 'Active now'). Entries far
 * in the future cannot be genuine, because the rules stamp server time.
 * @param {unknown} node `/active`
 * @param {object} options
 * @param {number} options.now current server time in ms
 * @param {number} [options.windowMs]
 * @returns {{total: number, recent: number}}
 */
export function presenceCounts(node, { now, windowMs = ACTIVE_WINDOW_MS }) {
    const entries = entriesOf(node).map(([, entry]) => entry);
    const recent = entries.filter(
        (entry) =>
            Number.isFinite(entry?.lastActive) &&
            entry.lastActive >= now - windowMs &&
            entry.lastActive <= now + windowMs
    ).length;
    return { total: entries.length, recent };
}

/**
 * Distinct sessions with at least one record in the participant data nodes.
 * @param {Record<string, unknown>} nodes values keyed by node name
 * @param {(record: unknown) => boolean} [keep] which records count
 * @returns {number}
 */
export function sessionsWithData(nodes, keep = () => true) {
    const ids = new Set();
    for (const name of PARTICIPANT_NODES) {
        for (const [sessionId, record] of sessionRecords(name, nodes?.[name])) {
            if (keep(record)) ids.add(sessionId);
        }
    }
    return ids.size;
}

/**
 * Distinct sessions that have used a room code in any participant data node.
 * @param {Record<string, unknown>} nodes values keyed by node name
 * @param {string} room a normalised room code
 * @returns {number}
 */
export function roomParticipants(nodes, room) {
    return sessionsWithData(nodes, (record) => isObject(record) && record.room === room);
}

/**
 * Record counts for every node that a deletion removes.
 * @param {Record<string, unknown>} nodes values keyed by node name
 * @returns {Record<string, number>} e.g. {ratings: 124, leaderboard: 7, ...}
 */
export function deletionCounts(nodes) {
    return Object.fromEntries(
        DELETED_NODES.map((name) => [name, recordCount(name, nodes?.[name])])
    );
}

/**
 * True when any node that a deletion removes holds something, even records
 * in a shape that the counts do not recognise.
 * @param {Record<string, unknown>} nodes values keyed by node name
 * @returns {boolean}
 */
export function hasDeletableData(nodes) {
    return DELETED_NODES.some((name) => nodes?.[name] !== null && nodes?.[name] !== undefined);
}

/**
 * The text a person must type to confirm a deletion: the number of
 * participants whose data goes, so that they have read it, or DELETE when
 * there is only presence data.
 * @param {number} participants sessions with data
 * @returns {string}
 */
export function deleteConfirmationText(participants) {
    return participants > 0 ? String(participants) : DELETE_WORD;
}
