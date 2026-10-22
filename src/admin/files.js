/**
 * File names and contents for the admin exports. Pure functions: the panel
 * reads the data and hands the text to downloadFile().
 *
 * - CSV, one file per node, with the columns documented in docs/data.md.
 * - JSON, one file per node holding the node exactly as stored, named as
 *   analysis/fetch-data.sh --from expects (ratings.json, leaderboard.json, ...).
 *   These can also be restored with `firebase database:set`.
 * - A full snapshot: every node a client can read, with the export time.
 */
import { APP_VERSION } from '../lib/config.js';
import {
    LEADERBOARD_COLUMNS,
    RANKING_COLUMNS,
    RATING_COLUMNS,
    SESSION_COLUMNS,
    flattenLeaderboard,
    flattenRankings,
    flattenRatings,
    flattenSessions,
    toCsv,
} from '../lib/export.js';
import { DELETED_NODES, recordCount } from './counts.js';

/** Start of every dated export file name. */
export const FILE_PREFIX = 'unlock-the-lab';

/** Nodes in the full snapshot: everything a client can read (all but /admins). */
export const SNAPSHOT_NODES = Object.freeze([...DELETED_NODES, 'control']);

export const CSV_MIME = 'text/csv;charset=utf-8';
export const JSON_MIME = 'application/json;charset=utf-8';

const CSV_FORMATS = Object.freeze({
    ratings: [flattenRatings, RATING_COLUMNS],
    leaderboard: [flattenLeaderboard, LEADERBOARD_COLUMNS],
    rankings: [flattenRankings, RANKING_COLUMNS],
    sessions: [flattenSessions, SESSION_COLUMNS],
});

function twoDigits(value) {
    return String(value).padStart(2, '0');
}

/**
 * Local date and time for file names, so that several exports on one day
 * (say, before and after a deletion) do not overwrite each other.
 * @param {Date} date
 * @returns {string} e.g. '2026-10-21-1530'
 */
export function fileStamp(date) {
    const day = [date.getFullYear(), twoDigits(date.getMonth() + 1), twoDigits(date.getDate())];
    return `${day.join('-')}-${twoDigits(date.getHours())}${twoDigits(date.getMinutes())}`;
}

/**
 * A dated export file name.
 * @param {string} stem e.g. 'ratings' or 'snapshot'
 * @param {string} extension e.g. 'csv'
 * @param {Date} date
 * @returns {string} e.g. 'unlock-the-lab-ratings-2026-10-21-1530.csv'
 */
export function datedFileName(stem, extension, date) {
    return `${FILE_PREFIX}-${stem}-${fileStamp(date)}.${extension}`;
}

/**
 * The name analysis/fetch-data.sh looks for, so that the per-node JSON files
 * can go straight into a folder for `--from`.
 * @param {string} name node name, e.g. 'ratings'
 * @returns {string} e.g. 'ratings.json'
 */
export function nodeFileName(name) {
    return `${name}.json`;
}

/**
 * True for nodes that have a CSV layout.
 * @param {string} name
 * @returns {boolean}
 */
export function hasCsvFormat(name) {
    return Object.hasOwn(CSV_FORMATS, name);
}

/**
 * A node as CSV, one row per record.
 * @param {string} name 'ratings', 'leaderboard', 'rankings' or 'sessions'
 * @param {unknown} value the node's value
 * @returns {string}
 */
export function nodeCsv(name, value) {
    if (!hasCsvFormat(name)) throw new Error(`No CSV layout for '${name}'`);
    const [flatten, columns] = CSV_FORMATS[name];
    return toCsv(flatten(value), columns);
}

/**
 * A node as pretty-printed JSON, exactly as stored. An empty node is `null`,
 * as in the daily backups, which the analysis reads as 'no records'.
 * @param {unknown} value
 * @returns {string}
 */
export function nodeJson(value) {
    return `${JSON.stringify(value ?? null, null, 2)}\n`;
}

/**
 * The full snapshot: export time, app version, record counts and every
 * readable node.
 * @param {Record<string, unknown>} nodes values keyed by node name
 * @param {object} options
 * @param {Date} options.exportedAt
 * @param {string} [options.appVersion]
 * @returns {{exportedAt: string, appVersion: string, counts: Record<string, number>,
 *   nodes: Record<string, unknown>}}
 */
export function buildSnapshot(nodes, { exportedAt, appVersion = APP_VERSION }) {
    return {
        exportedAt: exportedAt.toISOString(),
        appVersion,
        counts: Object.fromEntries(
            DELETED_NODES.map((name) => [name, recordCount(name, nodes?.[name])])
        ),
        nodes: Object.fromEntries(SNAPSHOT_NODES.map((name) => [name, nodes?.[name] ?? null])),
    };
}
