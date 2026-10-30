/**
 * Leaderboard reading and ranking, shared by the results page and the dashboard.
 *
 * Ranking (owner's decision): entries with at least MIN_STUDIES_TO_RANK rated
 * studies are ranked by mean accuracy per study. Order and ties use the
 * whole-number percentage people see, so the list never looks out of order:
 * a higher displayed % ranks higher; at the same %, more rated studies (more
 * summed points) ranks higher; the same % and the same number of studies share
 * a rank (competition ranking: 1, 2, 2, 4).
 */
import { MIN_STUDIES_TO_RANK, STUDY_COUNT } from './config.js';
import { ROOM_PATTERN, USERNAME_PATTERN } from './patterns.js';
import { displayedAccuracy, meanAccuracy } from './scoring.js';
import { normaliseUsername } from './username.js';

/**
 * @typedef {object} LeaderboardEntry
 * @property {string} sessionId
 * @property {string} userName the stored name, '' when missing
 * @property {boolean} nameValid false for empty or non-generated names (callers show a fallback)
 * @property {number} score summed prediction points
 * @property {number} papersRated
 * @property {number|null} meanAccuracy unrounded mean points per study
 * @property {number|null} displayedAccuracy whole-number percentage shown to people
 * @property {number|null} timestamp ms since the epoch, null when missing
 * @property {string|null} uid
 * @property {string|null} room
 * @property {number|null} [rank] set by rankEntries; null when not ranked
 */

/**
 * Turns a raw `/leaderboard` node into entries, dropping values that cannot be
 * genuine (non-objects, negative or impossible scores) and keeping legacy ones
 * (no uid, empty userName, no room).
 * @param {Record<string, unknown> | null | undefined} node
 * @returns {LeaderboardEntry[]}
 */
export function normaliseEntries(node) {
    if (!node || typeof node !== 'object') return [];
    return Object.entries(node)
        .map(([sessionId, value]) => normaliseEntry(sessionId, value))
        .filter(Boolean);
}

function normaliseEntry(sessionId, value) {
    if (!value || typeof value !== 'object') return null;

    const { score } = value;
    if (!Number.isFinite(score) || score < 0) return null;
    // Entries without papersRated are kept for counting; with no study count they are never ranked.
    const papersRated = value.papersRated ?? 0;
    if (!Number.isInteger(papersRated) || papersRated < 0 || papersRated > STUDY_COUNT) return null;
    if (value.papersRated !== undefined && score > papersRated * 100) return null;

    const userName = typeof value.userName === 'string' ? value.userName : '';
    return {
        sessionId,
        userName,
        nameValid: USERNAME_PATTERN.test(userName),
        score,
        papersRated,
        meanAccuracy: meanAccuracy(score, papersRated),
        displayedAccuracy: displayedAccuracy(score, papersRated),
        timestamp: Number.isFinite(value.timestamp) ? value.timestamp : null,
        uid: typeof value.uid === 'string' ? value.uid : null,
        room: typeof value.room === 'string' && ROOM_PATTERN.test(value.room) ? value.room : null,
    };
}

/**
 * Sort order: displayed %, then rated studies, then earliest first, then id
 * so the order is stable across renders.
 */
function compareEntries(a, b) {
    return (
        (b.displayedAccuracy ?? -1) - (a.displayedAccuracy ?? -1) ||
        b.papersRated - a.papersRated ||
        (a.timestamp ?? Infinity) - (b.timestamp ?? Infinity) ||
        (a.sessionId < b.sessionId ? -1 : a.sessionId > b.sessionId ? 1 : 0)
    );
}

function sameRank(a, b) {
    return a.displayedAccuracy === b.displayedAccuracy && a.papersRated === b.papersRated;
}

/**
 * Filters and ranks entries. Ranked entries come first; entries below
 * `minStudies` follow in the same order with `rank: null`.
 * @param {LeaderboardEntry[]} entries from normaliseEntries
 * @param {object} [options]
 * @param {number} [options.minStudies] defaults to MIN_STUDIES_TO_RANK
 * @param {number} [options.since] keep entries with timestamp >= since (ms)
 * @param {string|null} [options.room] keep entries from this room only
 * @returns {LeaderboardEntry[]} new objects with `rank`
 */
export function rankEntries(entries, { minStudies = MIN_STUDIES_TO_RANK, since, room } = {}) {
    const kept = (entries ?? []).filter(
        (entry) =>
            (since === undefined || since === null || (entry.timestamp ?? -Infinity) >= since) &&
            (!room || entry.room === room)
    );
    const isRankable = (entry) => entry.papersRated >= minStudies && entry.papersRated > 0;
    const ranked = kept.filter(isRankable).sort(compareEntries);
    const unranked = kept.filter((entry) => !isRankable(entry)).sort(compareEntries);

    let rank = 0;
    const withRanks = ranked.map((entry, index) => {
        if (index === 0 || !sameRank(entry, ranked[index - 1])) rank = index + 1;
        return { ...entry, rank };
    });
    return [...withRanks, ...unranked.map((entry) => ({ ...entry, rank: null }))];
}

/**
 * A participant's position in a ranked list.
 * @param {LeaderboardEntry[]} ranked from rankEntries
 * @param {string} sessionId
 * @returns {{entry: LeaderboardEntry, rank: number|null, rankedCount: number} | null}
 *   null when the session is not in the list; `rank` is null when it is not ranked yet
 */
export function findRank(ranked, sessionId) {
    const list = ranked ?? [];
    const entry = list.find((candidate) => candidate.sessionId === sessionId);
    if (!entry) return null;
    const rankedCount = list.filter((candidate) => candidate.rank !== null).length;
    return { entry, rank: entry.rank ?? null, rankedCount };
}

/**
 * Entries whose username matches `input` exactly after normalisation (case and
 * spaces ignored). Never a partial match: usernames are not unique in the
 * database, so callers must let people choose when several entries match.
 * @param {LeaderboardEntry[]} entries
 * @param {string} input
 * @returns {LeaderboardEntry[]} newest first
 */
export function findEntriesByUsername(entries, input) {
    const wanted = normaliseUsername(input);
    if (!wanted) return [];
    return (entries ?? [])
        .filter((entry) => entry.userName && normaliseUsername(entry.userName) === wanted)
        .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
}
