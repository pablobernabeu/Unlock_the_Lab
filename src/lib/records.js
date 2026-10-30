/**
 * Readers for records stored in the database, shared by the participant app,
 * the dashboard and the facilitator panel. They accept every legacy shape:
 * v1 records have no room, and very old ratings are bare numbers. Pure (no
 * Firebase, no DOM). The rating of a record is read by `ratingOf` in scoring.js.
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
