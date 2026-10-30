/**
 * Readers for records stored in the database, shared by the participant app,
 * the dashboard and the facilitator panel. They accept every legacy shape:
 * v1 records have no room or content version, and very old ratings are bare
 * numbers. Pure (no Firebase, no DOM). The rating of a record is read by
 * `ratingOf` in scoring.js.
 */
import { ROOM_PATTERN } from './patterns.js';

/**
 * True for a record or node stored as an object: not null, a number, a string
 * or an array.
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
export function isObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * The room a stored record belongs to.
 * @param {unknown} record a rating, leaderboard, rankings, session or presence value
 * @returns {string|null} null for v1 records, bare numbers and invalid codes
 */
export function recordRoom(record) {
    return isObject(record) && typeof record.room === 'string' && ROOM_PATTERN.test(record.room)
        ? record.room
        : null;
}

/**
 * True when a record belongs to `room`, or always when no room is selected.
 * @param {unknown} record
 * @param {string|null} room
 * @returns {boolean}
 */
export function inRoom(record, room) {
    return !room || recordRoom(record) === room;
}

/**
 * The content version a stored rating was made with.
 * @param {unknown} record a rating value
 * @returns {number} its `contentVersion`; 1 for v1 records and bare numbers, which have none
 */
export function recordContentVersion(record) {
    const version = isObject(record) ? record.contentVersion : undefined;
    return Number.isInteger(version) && version >= 1 ? version : 1;
}

/**
 * True when a rating was made with `contentVersion`, or always when no version is selected.
 * @param {unknown} record
 * @param {number|null} contentVersion
 * @returns {boolean}
 */
export function inContentVersion(record, contentVersion) {
    return !contentVersion || recordContentVersion(record) === contentVersion;
}
