/**
 * Pure computations behind the results page: per-study review rows, the
 * comparison with other participants and the expert, criterion weight shares
 * and the participant's own leaderboard entry. No DOM and no Firebase.
 */
import { RESULTS_TOP_N, TOKEN_BUDGET } from '../lib/config.js';
import { CRITERION_KEYS } from '../lib/criteria.js';
import { findEntriesByUsername, findRank, rankEntries } from '../lib/leaderboard.js';
import { SESSION_ID_PATTERN, USERNAME_PATTERN } from '../lib/patterns.js';
import {
    displayedAccuracy,
    isValidRating,
    meanAccuracy,
    ratingOf,
    validRatings,
} from '../lib/scoring.js';
import { mean } from '../lib/stats.js';

/** Average differences smaller than this (in scale points) count as 'close to the expert'. */
export const SIMILAR_THRESHOLD = 0.25;

/**
 * Mean of the other participants' ratings of one study (the expert is never in /ratings).
 * @param {Record<string, unknown>|null|undefined} node a `/ratings/{studyId}` value
 * @param {string} [excludeSessionId] the participant whose own rating is left out
 * @returns {{n: number, mean: number|null}}
 */
export function othersMean(node, excludeSessionId) {
    const ratings = validRatings(node, excludeSessionId);
    return { n: ratings.length, mean: mean(ratings) };
}

/**
 * Rows for the participant's own results, in the order the studies were rated.
 * @param {object[]} order studies in the participant's seeded order
 * @param {object} state participant state (see state.js)
 * @returns {Array<{study: object, rating: number, prediction: number|null, score: number|null,
 *   target: number|null, crowd: {n: number, mean: number|null}|null, trial: number}>}
 */
export function ownReviewRows(order, state) {
    return order
        .filter((study) => Object.hasOwn(state.userRatings, study.id))
        .map((study, index) => ({
            study,
            rating: state.userRatings[study.id],
            prediction: state.userPredictions[study.id] ?? null,
            score: state.paperScores[study.id] ?? null,
            target: state.paperTargets[study.id] ?? null,
            crowd: state.paperCrowd[study.id] ?? null,
            trial: index + 1,
        }));
}

function numberOrNull(value, isValid = Number.isFinite) {
    return isValid(value) ? value : null;
}

/**
 * Rows for a read-only results page, built from the whole `/ratings` tree.
 * v1 records lack target, score and trial; they come back as null.
 * @param {Record<string, Record<string, unknown>>|null} ratingsTree
 * @param {string} sessionId
 * @param {object[]} studies all studies (with id), any order
 * @returns {Array<{study: object, rating: number, prediction: number|null, score: number|null,
 *   target: number|null, crowd: null, trial: number|null, timestamp: number|null}>}
 */
export function readOnlyReviewRows(ratingsTree, sessionId, studies) {
    const rows = [];
    for (const study of studies) {
        const record = ratingsTree?.[study.id]?.[sessionId];
        const rating = ratingOf(record);
        if (rating === null) continue;
        const isScore = (value) => Number.isInteger(value) && value >= 0 && value <= 100;
        rows.push({
            study,
            rating,
            prediction: numberOrNull(record?.prediction, isValidRating),
            score: numberOrNull(record?.score, isScore),
            target: numberOrNull(record?.target, isValidRating),
            crowd: null,
            trial: numberOrNull(record?.trial, Number.isInteger),
            timestamp: numberOrNull(record?.timestamp),
        });
    }
    return rows.sort(
        (a, b) =>
            (a.trial ?? Infinity) - (b.trial ?? Infinity) ||
            (a.timestamp ?? Infinity) - (b.timestamp ?? Infinity)
    );
}

/**
 * Comparison of a participant's ratings with the other participants' means
 * and with the expert ratings.
 * @param {Array<{study: object, rating: number}>} rows
 * @param {Record<string, {n: number, mean: number|null}>} others studyId -> others' mean
 * @returns {{compared: number, missing: number, meanAbsFromOthers: number|null,
 *   meanAbsFromExpert: number|null, meanSignedFromExpert: number|null,
 *   direction: 'higher'|'lower'|'similar'|null}}
 */
export function ratingProfile(rows, others) {
    const fromOthers = [];
    const fromExpert = [];
    let missing = 0;
    for (const { study, rating } of rows) {
        const crowd = others?.[study.id];
        if (crowd && crowd.n > 0 && Number.isFinite(crowd.mean)) {
            fromOthers.push(Math.abs(rating - crowd.mean));
        } else {
            missing += 1;
        }
        if (isValidRating(study.expertRating)) fromExpert.push(rating - study.expertRating);
    }
    const signed = mean(fromExpert);
    let direction = null;
    if (signed !== null) {
        if (signed > SIMILAR_THRESHOLD) direction = 'higher';
        else if (signed < -SIMILAR_THRESHOLD) direction = 'lower';
        else direction = 'similar';
    }
    return {
        compared: fromOthers.length,
        missing,
        meanAbsFromOthers: mean(fromOthers),
        meanAbsFromExpert: mean(fromExpert.map(Math.abs)),
        meanSignedFromExpert: signed,
        direction,
    };
}

/**
 * Points for the rating-profile scatter chart: x is the others' mean, y the participant's rating.
 * Studies without ratings from others are left out.
 * @param {Array<{study: object, rating: number}>} rows
 * @param {Record<string, {n: number, mean: number|null}>} others
 * @returns {Array<{x: number, y: number, n: number, studyId: string, title: string}>}
 */
export function chartPoints(rows, others) {
    return rows
        .filter(({ study }) => others?.[study.id]?.n > 0 && Number.isFinite(others[study.id].mean))
        .map(({ study, rating }) => ({
            x: others[study.id].mean,
            y: rating,
            n: others[study.id].n,
            studyId: study.id,
            title: study.title,
        }));
}

/**
 * Criterion weights as shares of the budget, in rubric order.
 * @param {Record<string, number>|null|undefined} tokens
 * @param {number} [budget]
 * @returns {Array<{key: string, count: number, percent: number}>|null} null when the
 *   allocation is incomplete (it must use the whole budget)
 */
export function tokenShares(tokens, budget = TOKEN_BUDGET) {
    if (!tokens) return null;
    const counts = CRITERION_KEYS.map((key) => tokens[key]);
    if (counts.some((count) => !Number.isInteger(count) || count < 0)) return null;
    const total = counts.reduce((sum, count) => sum + count, 0);
    if (total !== budget) return null;
    return CRITERION_KEYS.map((key, index) => ({
        key,
        count: counts[index],
        percent: (counts[index] / budget) * 100,
    }));
}

/**
 * Adds or refreshes the participant's own entry in normalised leaderboard
 * entries using the local totals, so their rank is right even when their
 * latest leaderboard write has not landed (or cannot: frozen v1 entries).
 * @param {object[]} entries from normaliseEntries
 * @param {object} own
 * @param {string} own.sessionId
 * @param {string} own.userName
 * @param {number} own.score
 * @param {number} own.papersRated
 * @param {string|null} own.room
 * @param {number} own.now ms, used as the timestamp of a refreshed entry
 * @returns {object[]}
 */
export function withOwnEntry(entries, { sessionId, userName, score, papersRated, room, now }) {
    const existing = entries.find((entry) => entry.sessionId === sessionId);
    if (existing && existing.papersRated >= papersRated && existing.score >= score) return entries;
    const own = {
        sessionId,
        userName,
        nameValid: USERNAME_PATTERN.test(userName ?? ''),
        score,
        papersRated,
        meanAccuracy: meanAccuracy(score, papersRated),
        displayedAccuracy: displayedAccuracy(score, papersRated),
        timestamp: existing?.timestamp ?? now,
        uid: existing?.uid ?? null,
        room: room ?? existing?.room ?? null,
    };
    return [...entries.filter((entry) => entry.sessionId !== sessionId), own];
}

/**
 * Score totals for a read-only page: the leaderboard entry, or the per-rating
 * scores stored by v2 (only when every row has one) when there is no entry or
 * they cover more studies than the entry (an entry left behind, for example
 * by a second tab of the session).
 * @param {{score: number, papersRated: number}|null} entry
 * @param {Array<{score: number|null}>} rows
 * @returns {{score: number, papersRated: number}|null}
 */
export function readOnlyTotals(entry, rows) {
    const scored = rows.length > 0 && rows.every((row) => Number.isInteger(row.score));
    const fromRows = scored
        ? { score: rows.reduce((sum, row) => sum + row.score, 0), papersRated: rows.length }
        : null;
    const hasEntry = entry && entry.papersRated > 0;
    if (hasEntry && !(fromRows && fromRows.papersRated > entry.papersRated)) {
        return { score: entry.score, papersRated: entry.papersRated };
    }
    return fromRows;
}

/**
 * The top of a ranked leaderboard and the participant's position in it.
 * @param {object[]} entries from normaliseEntries (with the participant's own entry, see withOwnEntry)
 * @param {object} options
 * @param {string} options.sessionId the participant whose position is wanted
 * @param {string|null} [options.room] rank this room only; null ranks everyone
 * @param {number} [options.topN]
 * @returns {{top: object[], position: {entry: object, rank: number|null, rankedCount: number}|null,
 *   rankedCount: number}}
 */
export function leaderboardView(entries, { sessionId, room = null, topN = RESULTS_TOP_N }) {
    const ranked = rankEntries(entries, { room });
    const rankedOnly = ranked.filter((entry) => entry.rank !== null);
    return {
        top: rankedOnly.slice(0, topN),
        position: findRank(ranked, sessionId),
        rankedCount: rankedOnly.length,
    };
}

/**
 * Works out which session a `?session=` value names. v1 links carry a session
 * id; a nickname is accepted too (exact match after ignoring case and spaces),
 * since some people shared their nickname instead.
 * @param {string} param
 * @param {object[]} entries normalised leaderboard entries
 * @returns {{sessionId: string} | {matches: object[]} | null}
 */
export function resolveSessionParam(param, entries) {
    const value = String(param ?? '').trim();
    if (SESSION_ID_PATTERN.test(value)) return { sessionId: value };
    const lower = value.toLowerCase();
    if (SESSION_ID_PATTERN.test(lower)) return { sessionId: lower };
    const matches = findEntriesByUsername(entries, value);
    if (matches.length === 1) return { sessionId: matches[0].sessionId };
    if (matches.length > 1) return { matches };
    return null;
}
