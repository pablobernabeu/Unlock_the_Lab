/**
 * Database reads behind the results page, for the participant's own results
 * and for a read-only `?session=` page. Only what the page needs is read:
 * the leaderboard, the participant's ratings and the rating nodes of the
 * studies they rated. Nothing here writes.
 */
import { get, ref } from 'firebase/database';
import { isValidAllocation } from '../lib/criteria.js';
import { db } from '../lib/firebase.js';
import { normaliseEntries } from '../lib/leaderboard.js';
import { USERNAME_PATTERN } from '../lib/patterns.js';
import { DB_TIMEOUT_MS, withTimeout } from './db-utils.js';
import { othersMean, readOnlyReviewRows, resolveSessionParam } from './results-model.js';

async function read(path) {
    const snapshot = await withTimeout(get(ref(db, path)), DB_TIMEOUT_MS, `Reading ${path}`);
    return snapshot.val();
}

/**
 * Normalised leaderboard entries.
 * @returns {Promise<object[]>}
 */
export async function loadLeaderboard() {
    return normaliseEntries(await read('leaderboard'));
}

/**
 * Other participants' mean rating of each study, leaving out `sessionId`.
 * @param {string[]} studyIds
 * @param {string} sessionId
 * @returns {Promise<Record<string, {n: number, mean: number|null}>>}
 */
export async function loadOthersMeans(studyIds, sessionId) {
    const pairs = await Promise.all(
        studyIds.map(async (id) => [id, othersMean(await read(`ratings/${id}`), sessionId)])
    );
    return Object.fromEntries(pairs);
}

/**
 * A session's saved criterion weights, or null when there are none.
 * @param {string} sessionId
 * @returns {Promise<{tokens: Record<string, number>|null, userName: string|null}>}
 */
export async function loadRanking(sessionId) {
    const value = await read(`rankings/${sessionId}`);
    return {
        tokens: isValidAllocation(value) ? value : null,
        userName:
            typeof value?.userName === 'string' && USERNAME_PATTERN.test(value.userName)
                ? value.userName
                : null,
    };
}

/**
 * Everything a read-only results page shows.
 * @param {object[]} studies all studies
 * @param {string} param the `?session=` value
 * @returns {Promise<{kind: 'results', sessionId: string, entry: object|null, entries: object[],
 *   rows: object[], tokens: Record<string, number>|null, userName: string|null}
 *   | {kind: 'choose', matches: object[]} | {kind: 'notFound'}>}
 */
export async function loadReadOnlyResults(studies, param) {
    const entries = await loadLeaderboard();
    const resolved = resolveSessionParam(param, entries);
    if (!resolved) return { kind: 'notFound' };
    if (resolved.matches) return { kind: 'choose', matches: resolved.matches };

    const { sessionId } = resolved;
    const records = await Promise.all(
        studies.map(async (study) => [study.id, await read(`ratings/${study.id}/${sessionId}`)])
    );
    const tree = Object.fromEntries(
        records
            .filter(([, record]) => record !== null && record !== undefined)
            .map(([id, record]) => [id, { [sessionId]: record }])
    );
    const rows = readOnlyReviewRows(tree, sessionId, studies);
    const entry = entries.find((candidate) => candidate.sessionId === sessionId) ?? null;
    if (!entry && rows.length === 0) return { kind: 'notFound' };

    const ranking = await loadRanking(sessionId).catch(() => ({ tokens: null, userName: null }));
    const userName = entry?.nameValid ? entry.userName : ranking.userName;
    return { kind: 'results', sessionId, entry, entries, rows, tokens: ranking.tokens, userName };
}
