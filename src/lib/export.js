/**
 * Flattens database nodes into rows for CSV export. Every column of every
 * node is listed, so legacy records simply have empty cells for fields that
 * did not exist yet. Column meanings are documented in docs/data.md.
 */

// prettier-ignore
export const RATING_COLUMNS = Object.freeze([
    'sessionId', 'studyId', 'rating', 'prediction', 'responseTime', 'timestamp', 'uid',
    'contentVersion', 'feedbackShown', 'target', 'score', 'trial', 'locale', 'room',
]);

// prettier-ignore
export const LEADERBOARD_COLUMNS = Object.freeze([
    'sessionId', 'userName', 'score', 'papersRated', 'timestamp', 'uid', 'room',
]);

// prettier-ignore
export const RANKING_COLUMNS = Object.freeze([
    'sessionId', 'title', 'access', 'source', 'theory', 'methods', 'conclusion',
    'userName', 'timestamp', 'uid', 'room',
]);

// prettier-ignore
export const SESSION_COLUMNS = Object.freeze([
    'sessionId', 'uid', 'createdAt', 'contentVersion', 'appVersion', 'locale', 'feedbackMode', 'room',
]);

function entriesOf(node) {
    return node && typeof node === 'object' ? Object.entries(node) : [];
}

function pickColumns(record, columns) {
    return Object.fromEntries(columns.map((column) => [column, record?.[column] ?? null]));
}

function flattenKeyed(node, columns) {
    return entriesOf(node)
        .filter(([, value]) => value && typeof value === 'object')
        .map(([sessionId, value]) => ({ ...pickColumns(value, columns), sessionId }));
}

/**
 * One row per rating from `/ratings/{studyId}/{sessionId}`. Very old ratings
 * stored as bare numbers become rows with only `rating` filled.
 * @param {Record<string, Record<string, unknown>> | null} node
 * @returns {Array<Record<string, unknown>>} rows keyed by RATING_COLUMNS
 */
export function flattenRatings(node) {
    const rows = [];
    for (const [studyId, sessions] of entriesOf(node)) {
        for (const [sessionId, value] of entriesOf(sessions)) {
            const record = typeof value === 'number' ? { rating: value } : value;
            if (!record || typeof record !== 'object') continue;
            rows.push({ ...pickColumns(record, RATING_COLUMNS), sessionId, studyId });
        }
    }
    return rows;
}

/**
 * One row per `/leaderboard/{sessionId}` entry.
 * @param {Record<string, unknown> | null} node
 * @returns {Array<Record<string, unknown>>} rows keyed by LEADERBOARD_COLUMNS
 */
export function flattenLeaderboard(node) {
    return flattenKeyed(node, LEADERBOARD_COLUMNS);
}

/**
 * One row per `/rankings/{sessionId}` token allocation.
 * @param {Record<string, unknown> | null} node
 * @returns {Array<Record<string, unknown>>} rows keyed by RANKING_COLUMNS
 */
export function flattenRankings(node) {
    return flattenKeyed(node, RANKING_COLUMNS);
}

/**
 * One row per `/sessions/{sessionId}` record.
 * @param {Record<string, unknown> | null} node
 * @returns {Array<Record<string, unknown>>} rows keyed by SESSION_COLUMNS
 */
export function flattenSessions(node) {
    return flattenKeyed(node, SESSION_COLUMNS);
}

/** Leading characters that make spreadsheet software treat a cell as a formula. */
const FORMULA_TRIGGERS = /^[=+\-@\t\r]/;

function csvCell(value) {
    if (value === null || value === undefined) return '';
    let text = typeof value === 'object' ? JSON.stringify(value) : String(value);
    // Only strings are guarded: a negative number such as -3 is data, not a formula.
    if (typeof value === 'string' && FORMULA_TRIGGERS.test(text)) text = `'${text}`;
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Serialises rows as RFC 4180 CSV (CRLF line endings, quoted fields where needed).
 * String cells starting with = + - @ (or a tab or carriage return) get a
 * leading apostrophe so spreadsheets do not run them as formulas.
 * @param {Array<Record<string, unknown>>} rows
 * @param {readonly string[]} columns header and column order
 * @returns {string}
 */
export function toCsv(rows, columns) {
    const lines = [columns.map(csvCell).join(',')];
    for (const row of rows ?? []) {
        lines.push(columns.map((column) => csvCell(row?.[column])).join(','));
    }
    return `${lines.join('\r\n')}\r\n`;
}

/**
 * Offers text to the person as a file download.
 * @param {string} name file name, e.g. 'ratings-2026-10-21.csv'
 * @param {string} text file contents
 * @param {string} [mime] e.g. 'text/csv;charset=utf-8'
 * @returns {void}
 */
export function downloadFile(name, text, mime = 'text/plain;charset=utf-8') {
    const url = URL.createObjectURL(new Blob([text], { type: mime }));
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.hidden = true;
    document.body.append(link);
    link.click();
    link.remove();
    // Revoking immediately can cancel the download in some browsers.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
