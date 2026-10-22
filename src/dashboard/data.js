/**
 * Data shaping for the public dashboard: pure functions over raw Realtime
 * Database snapshots, free of Firebase and the DOM so they can be unit-tested.
 *
 * Rooms: v2 records carry a `room` code; v1 records have none, so they only
 * count when no room is selected. Readers accept every legacy shape the
 * database holds (bare-number ratings, missing fields, empty usernames).
 */
import {
    ACTIVE_WINDOW_MS,
    LEADERBOARD_SIZE,
    MIN_STUDIES_TO_FINISH,
    MIN_STUDIES_TO_RANK,
} from '../lib/config.js';
import { compareStudyIds, qualityBand, studyNumber } from '../lib/content.js';
import { isValidAllocation } from '../lib/criteria.js';
import { rankEntries } from '../lib/leaderboard.js';
import { ROOM_PATTERN, SESSION_ID_PATTERN, STUDY_ID_PATTERN } from '../lib/patterns.js';
import { isValidRating } from '../lib/scoring.js';
import { mean, meanCI, shareCI } from '../lib/stats.js';

export const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * How far ahead of the server clock a stored time may be and still count as
 * recent. The rules stamp server time on every write, so anything further
 * ahead is a crafted or corrupt legacy value.
 */
export const CLOCK_TOLERANCE_MS = 5 * 60 * 1000;

/** Shortest scale for the criterion bars, so typical shares (about 1 in 6) are not squashed. */
const MIN_SHARE_SCALE = 0.4;

function isObject(value) {
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
 * @typedef {object} RatingGroup
 * @property {number[]} ratings valid quality ratings (1-7)
 * @property {number[]} predictions valid predictions from the same records
 * @property {string[]} sessionIds one per rating, in the same order
 */

/**
 * Groups the valid ratings in a `/ratings` node by study. A record counts when
 * its rating is on the 1-7 scale; very old records are bare numbers.
 * @param {Record<string, unknown> | null | undefined} node `/ratings`
 * @param {object} [options]
 * @param {string|null} [options.room] keep only ratings made in this room
 * @param {Iterable<string>|null} [options.studyIds] keep only these studies
 * @returns {Map<string, RatingGroup>}
 */
export function groupRatings(node, { room = null, studyIds = null } = {}) {
    const groups = new Map();
    if (!isObject(node)) return groups;
    const allowed = studyIds ? new Set(studyIds) : null;
    for (const [studyId, studyNode] of Object.entries(node)) {
        if (!STUDY_ID_PATTERN.test(studyId) || !isObject(studyNode)) continue;
        if (allowed && !allowed.has(studyId)) continue;
        const group = { ratings: [], predictions: [], sessionIds: [] };
        for (const [sessionId, record] of Object.entries(studyNode)) {
            const rating = typeof record === 'number' ? record : record?.rating;
            if (!isValidRating(rating) || !inRoom(record, room)) continue;
            group.ratings.push(rating);
            group.sessionIds.push(sessionId);
            if (isValidRating(record?.prediction)) group.predictions.push(record.prediction);
        }
        groups.set(studyId, group);
    }
    return groups;
}

/**
 * Headline counts from grouped ratings.
 * @param {Map<string, RatingGroup>} groups
 * @param {object} [options]
 * @param {number} [options.minStudies] studies needed to count as completed
 * @returns {{participants: number, ratings: number, completed: number}}
 *   participants: sessions with at least one rating; completed: with at least `minStudies`
 */
export function overviewCounts(groups, { minStudies = MIN_STUDIES_TO_FINISH } = {}) {
    const perSession = new Map();
    let ratings = 0;
    for (const { sessionIds } of groups.values()) {
        ratings += sessionIds.length;
        for (const id of sessionIds) perSession.set(id, (perSession.get(id) ?? 0) + 1);
    }
    const completed = [...perSession.values()].filter((count) => count >= minStudies).length;
    return { participants: perSession.size, ratings, completed };
}

/**
 * Text of a content string without its trusted markup (for canvas text and sorting).
 * @param {unknown} html e.g. 'Effects in <i>N</i> = 12 pupils'
 * @returns {string}
 */
export function plainText(html) {
    return String(html ?? '')
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * A title cut at a word boundary, for table cells and tooltips.
 * @param {unknown} title
 * @param {number} [maxLength] including the ellipsis
 * @returns {string}
 */
export function shortTitle(title, maxLength = 48) {
    const text = plainText(title);
    if (text.length <= maxLength) return text;
    const cut = text.slice(0, maxLength - 1);
    const space = cut.lastIndexOf(' ');
    const base = space > maxLength / 2 ? cut.slice(0, space) : cut;
    return `${base.replace(/[\s,;:.–-]+$/, '')}…`;
}

/**
 * @typedef {object} StudyRow
 * @property {string} id
 * @property {number} number e.g. 12 for STUDY-12
 * @property {string} title plain text
 * @property {string} shortTitle
 * @property {number|null} expertRating
 * @property {'low'|'medium'|'high'|null} band expert quality band
 * @property {number} n participant ratings
 * @property {number|null} mean
 * @property {number|null} sd
 * @property {number|null} lower 95% CI, null when n < 2
 * @property {number|null} upper
 * @property {number|null} meanPrediction
 * @property {number} predictions number of predictions behind meanPrediction
 */

const NO_RATINGS = Object.freeze({ ratings: [], predictions: [], sessionIds: [] });

/**
 * One row of statistics per study, in content order, from participant ratings only.
 * @param {Array<{id: string, title: string, expertRating: number|null}>} studies from loadContent
 * @param {Map<string, RatingGroup>} groups
 * @returns {StudyRow[]}
 */
export function studyRows(studies, groups) {
    return (studies ?? []).map((study) => {
        const group = groups.get(study.id) ?? NO_RATINGS;
        const ci = meanCI(group.ratings);
        const expertRating = isValidRating(study.expertRating) ? study.expertRating : null;
        return {
            id: study.id,
            number: studyNumber(study.id),
            title: plainText(study.title),
            shortTitle: shortTitle(study.title),
            expertRating,
            band: qualityBand(expertRating),
            n: ci.n,
            mean: ci.mean,
            sd: ci.sd,
            lower: ci.lower,
            upper: ci.upper,
            meanPrediction: mean(group.predictions),
            predictions: group.predictions.length,
        };
    });
}

/**
 * Figures for the sentence under the ratings chart.
 * @param {StudyRow[]} rows
 * @returns {{total: number, rated: number, close: number}} `close`: rated studies whose
 *   participant mean is within one scale point of the expert rating
 */
export function chartSummary(rows) {
    const rated = rows.filter((row) => row.n > 0);
    const close = rated.filter(
        (row) => row.expertRating !== null && Math.abs(row.mean - row.expertRating) <= 1
    ).length;
    return { total: rows.length, rated: rated.length, close };
}

/** How each sortable column reads its value; null values always sort last. */
const SORT_VALUES = Object.freeze({
    title: (row) => row.title,
    expert: (row) => row.expertRating,
    n: (row) => row.n,
    mean: (row) => row.mean,
    sd: (row) => row.sd,
    ci: (row) => row.lower,
    prediction: (row) => row.meanPrediction,
});

/** Column keys the statistics table can sort by. */
export const SORT_KEYS = Object.freeze(['study', ...Object.keys(SORT_VALUES)]);

/**
 * Sorts study rows for the statistics table. Study ids sort by number
 * (STUDY-2 before STUDY-10); missing values go last in either direction;
 * ties keep study order so the table does not shuffle between updates.
 * @param {StudyRow[]} rows
 * @param {{key?: string, direction?: 'ascending'|'descending'}} [sort]
 * @param {string} [locale] for comparing titles
 * @returns {StudyRow[]} a new array
 */
export function sortStudyRows(
    rows,
    { key = 'study', direction = 'ascending' } = {},
    locale = 'en'
) {
    const sign = direction === 'descending' ? -1 : 1;
    const valueOf = SORT_VALUES[key];
    return [...rows].sort((a, b) => {
        if (!valueOf) return sign * compareStudyIds(a.id, b.id);
        const [first, second] = [valueOf(a), valueOf(b)];
        const missing = (first === null) - (second === null);
        if (missing !== 0) return missing;
        if (first === null) return compareStudyIds(a.id, b.id);
        const order =
            typeof first === 'string' ? first.localeCompare(second, locale) : first - second;
        return sign * order || compareStudyIds(a.id, b.id);
    });
}

/**
 * Presence entries active within the window.
 * @param {Record<string, unknown> | null | undefined} node `/active`
 * @param {object} options
 * @param {number} options.now current server time in ms
 * @param {string|null} [options.room]
 * @param {number} [options.windowMs]
 * @returns {number}
 */
export function countActive(node, { now, room = null, windowMs = ACTIVE_WINDOW_MS }) {
    if (!isObject(node)) return 0;
    // Entries far in the future cannot be genuine heartbeats (the rules stamp server time).
    return Object.values(node).filter(
        (entry) =>
            isObject(entry) &&
            Number.isFinite(entry.lastActive) &&
            entry.lastActive >= now - windowMs &&
            entry.lastActive <= now + windowMs &&
            inRoom(entry, room)
    ).length;
}

/**
 * Room codes used in any of the given nodes, sorted with numbers in order (ROOM-2 before ROOM-10).
 * @param {...(Record<string, unknown> | null | undefined)} nodes e.g. sessions, leaderboard, rankings
 * @returns {string[]}
 */
export function collectRooms(...nodes) {
    const rooms = new Set();
    for (const node of nodes) {
        if (!isObject(node)) continue;
        for (const value of Object.values(node)) {
            const room = recordRoom(value);
            if (room) rooms.add(room);
        }
    }
    return [...rooms].sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
}

/**
 * Average share of tokens per criterion with 95% intervals, from valid
 * allocations (whole numbers from 0 to 20 that add up to 20) in the room.
 * @param {Record<string, unknown> | null | undefined} node `/rankings`
 * @param {object} [options]
 * @param {string|null} [options.room]
 * @returns {{n: number, criteria: Array<{key: string, mean: number|null, lower: number|null,
 *   upper: number|null}>, scaleMax: number}} shares are proportions; `scaleMax` is the
 *   right-hand end of the bars' scale
 */
export function criterionShares(node, { room = null } = {}) {
    const allocations = isObject(node)
        ? Object.values(node).filter((entry) => isValidAllocation(entry) && inRoom(entry, room))
        : [];
    const { n, criteria } = shareCI(allocations);
    const highest = Math.max(0, ...criteria.map((item) => item.upper ?? item.mean ?? 0));
    return {
        n,
        criteria: criteria.map(({ key, mean: share, lower, upper }) => ({
            key,
            mean: share,
            lower,
            upper,
        })),
        scaleMax: shareScaleMax(highest),
    };
}

/**
 * The end of the criterion bar scale: the highest value rounded up to a whole
 * 10%, at least 40% and at most 100%.
 * @param {number} highest a proportion
 * @returns {number}
 */
export function shareScaleMax(highest) {
    // The small offset stops floating-point noise (0.30000000000000004) rounding up a step.
    const tenths = Math.ceil(highest * 10 - 1e-9) / 10;
    return Math.min(1, Math.max(MIN_SHARE_SCALE, tenths));
}

/**
 * The leaderboard as shown on the dashboard.
 * @param {import('../lib/leaderboard.js').LeaderboardEntry[]} entries from normaliseEntries
 * @param {object} options
 * @param {'all'|'day'} [options.period] 'day' keeps entries updated in the past 24 hours
 *   (an entry dated in the future would otherwise stay there for good, so it is left out)
 * @param {number} options.now current server time in ms
 * @param {string|null} [options.room]
 * @param {number} [options.limit] places listed; tied entries at the last place are kept
 * @param {number} [options.minStudies]
 * @returns {{rows: import('../lib/leaderboard.js').LeaderboardEntry[], rankedCount: number,
 *   unrankedCount: number, truncated: boolean}}
 */
export function leaderboardView(
    entries,
    { period = 'all', now, room = null, limit = LEADERBOARD_SIZE, minStudies = MIN_STUDIES_TO_RANK }
) {
    const day = period === 'day';
    const since = day ? now - DAY_MS : undefined;
    const candidates = day
        ? (entries ?? []).filter((entry) => (entry.timestamp ?? 0) <= now + CLOCK_TOLERANCE_MS)
        : entries;
    const listed = rankEntries(candidates, { minStudies, since, room });
    const ranked = listed.filter((entry) => entry.rank !== null);
    const rows = ranked.filter((entry) => entry.rank <= limit);
    return {
        rows,
        rankedCount: ranked.length,
        unrankedCount: listed.length - ranked.length,
        truncated: rows.length < ranked.length,
    };
}

/**
 * The session saved by the workshop on this device.
 * @param {unknown} state the parsed `workshopState` value
 * @returns {string|null}
 */
export function localSessionId(state) {
    const id = isObject(state) ? state.sessionId : null;
    return typeof id === 'string' && SESSION_ID_PATTERN.test(id) ? id : null;
}

/**
 * True when a session has at least one valid rating, in any room.
 * @param {Record<string, unknown> | null | undefined} node `/ratings`
 * @param {string|null} sessionId
 * @returns {boolean}
 */
export function sessionHasRatings(node, sessionId) {
    if (!isObject(node) || typeof sessionId !== 'string') return false;
    return Object.values(node).some((studyNode) => {
        if (!isObject(studyNode) || !Object.hasOwn(studyNode, sessionId)) return false;
        const record = studyNode[sessionId];
        return isValidRating(typeof record === 'number' ? record : record?.rating);
    });
}

/**
 * Interprets the 'find your results' input: a username, a session id or a results link.
 * @param {unknown} input
 * @returns {{kind: 'empty'} | {kind: 'badLink'} | {kind: 'session', sessionId: string}
 *   | {kind: 'name', name: string}}
 */
export function parseLookup(input) {
    const text = typeof input === 'string' ? input.trim() : '';
    if (!text) return { kind: 'empty' };
    if (SESSION_ID_PATTERN.test(text)) return { kind: 'session', sessionId: text };
    if (/[?&]session=/.test(text)) {
        try {
            const sessionId = new URL(text, 'https://example.invalid/').searchParams.get('session');
            if (sessionId && SESSION_ID_PATTERN.test(sessionId))
                return { kind: 'session', sessionId };
        } catch {
            // Not a URL: reported as a bad link below.
        }
        return { kind: 'badLink' };
    }
    return { kind: 'name', name: text };
}

/**
 * Link to a participant's read-only results page.
 * @param {string} sessionId
 * @returns {string|null} null for ids that are not genuine session ids
 */
export function resultsHref(sessionId) {
    if (typeof sessionId !== 'string' || !SESSION_ID_PATTERN.test(sessionId)) return null;
    return `/?${new URLSearchParams({ session: sessionId })}`;
}

/**
 * Where to draw an error bar along the value axis, clipped to the plot area.
 * A limit outside the area is drawn at the edge without an end cap.
 * @param {number} lowerPx pixel position of the lower limit
 * @param {number} upperPx pixel position of the upper limit
 * @param {number} areaStart one edge of the plot area along the value axis
 * @param {number} areaEnd the other edge
 * @returns {{from: number, to: number, capFrom: boolean, capTo: boolean} | null}
 *   `from` belongs to the lower limit; null when the whole interval is outside
 */
export function errorBarSegment(lowerPx, upperPx, areaStart, areaEnd) {
    const values = [lowerPx, upperPx, areaStart, areaEnd];
    if (!values.every(Number.isFinite)) return null;
    const min = Math.min(areaStart, areaEnd);
    const max = Math.max(areaStart, areaEnd);
    if (Math.max(lowerPx, upperPx) < min || Math.min(lowerPx, upperPx) > max) return null;
    const tolerance = 0.5;
    const inside = (px) => px >= min - tolerance && px <= max + tolerance;
    const clamp = (px) => Math.min(max, Math.max(min, px));
    return {
        from: clamp(lowerPx),
        to: clamp(upperPx),
        capFrom: inside(lowerPx),
        capTo: inside(upperPx),
    };
}
