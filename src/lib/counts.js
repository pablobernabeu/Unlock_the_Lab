/**
 * The headline figures that both the public dashboard ('At a glance') and the
 * facilitator panel ('Overview') show: participants with ratings, ratings,
 * sessions that rated enough studies to finish, and participants active now.
 * One implementation, so the two pages always agree. Pure functions over raw
 * database nodes (no Firebase, no DOM) that accept legacy records: ratings
 * stored as bare numbers, and records without a room.
 */
import { ACTIVE_WINDOW_MS, MIN_STUDIES_TO_FINISH, STUDY_COUNT } from './config.js';
import { STUDY_ID_PATTERN } from './patterns.js';
import { inRoom, isObject } from './records.js';
import { ratingOf } from './scoring.js';

/**
 * True for the ids of the workshop's studies (STUDY-1 to STUDY-48), the ones
 * the pages show. The rules accept ids up to STUDY-99.
 * @param {string} studyId
 * @returns {boolean}
 */
export function isWorkshopStudy(studyId) {
    if (!STUDY_ID_PATTERN.test(studyId)) return false;
    return Number(studyId.slice(studyId.indexOf('-') + 1)) <= STUDY_COUNT;
}

/**
 * Headline figures from `/ratings`. A rating counts when it is on the 1-7
 * scale, belongs to one of the workshop's studies and, when a room is
 * selected, was made in that room.
 * @param {unknown} node `/ratings`
 * @param {object} [options]
 * @param {string|null} [options.room] count only ratings made in this room (null: all)
 * @param {number} [options.minStudies] rated studies needed to count as completed
 * @returns {{participants: number, ratings: number, completed: number}}
 *   participants: sessions with at least one rating; completed: with at least `minStudies`
 */
export function ratingCounts(node, { room = null, minStudies = MIN_STUDIES_TO_FINISH } = {}) {
    const perSession = new Map();
    let ratings = 0;
    for (const [studyId, study] of isObject(node) ? Object.entries(node) : []) {
        if (!isWorkshopStudy(studyId) || !isObject(study)) continue;
        for (const [sessionId, record] of Object.entries(study)) {
            if (ratingOf(record) === null || !inRoom(record, room)) continue;
            ratings += 1;
            perSession.set(sessionId, (perSession.get(sessionId) ?? 0) + 1);
        }
    }
    const completed = [...perSession.values()].filter((count) => count >= minStudies).length;
    return { participants: perSession.size, ratings, completed };
}

/**
 * Participants active now: presence entries in `/active` whose last heartbeat
 * falls within the active window. Entries far in the future cannot be genuine,
 * because the rules stamp server time, so they do not count.
 * @param {unknown} node `/active`
 * @param {object} options
 * @param {number} options.now current server time in ms
 * @param {string|null} [options.room] count only entries in this room (null: all)
 * @param {number} [options.windowMs]
 * @returns {number}
 */
export function countActive(node, { now, room = null, windowMs = ACTIVE_WINDOW_MS }) {
    if (!isObject(node)) return 0;
    return Object.values(node).filter(
        (entry) =>
            isObject(entry) &&
            Number.isFinite(entry.lastActive) &&
            entry.lastActive >= now - windowMs &&
            entry.lastActive <= now + windowMs &&
            inRoom(entry, room)
    ).length;
}
