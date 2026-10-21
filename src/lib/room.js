/**
 * Facilitator room codes (`?room=CODE`). Rooms filter the leaderboard and the
 * dashboard; the scoring target stays global so scores remain comparable.
 */
import { ROOM_PATTERN } from './patterns.js';

/**
 * Cleans a typed or linked room code.
 * @param {unknown} input e.g. ' oxford-1 '
 * @returns {string | null} e.g. 'OXFORD-1', or null when the code is not valid
 */
export function normaliseRoom(input) {
    if (typeof input !== 'string') return null;
    const room = input.trim().toUpperCase();
    return ROOM_PATTERN.test(room) ? room : null;
}

/**
 * The room named in a URL's `room` parameter.
 * @param {string | URL} [url] defaults to the current page
 * @returns {string | null}
 */
export function roomFromUrl(url = globalThis.location?.href) {
    if (!url) return null;
    try {
        return normaliseRoom(new URL(url, 'http://localhost').searchParams.get('room'));
    } catch {
        return null;
    }
}

/**
 * A link to a page for a room, e.g. 'https://unlock-the-lab.web.app/?room=OXFORD-1'.
 * @param {string} origin e.g. location.origin
 * @param {string} room a normalised room code
 * @param {string} [path] '/' for the workshop, '/dashboard.html' for the dashboard
 * @returns {string}
 */
export function roomUrl(origin, room, path = '/') {
    const url = new URL(path, origin);
    url.searchParams.set('room', room);
    return url.toString();
}
