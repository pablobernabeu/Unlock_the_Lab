/**
 * Participant state kept in localStorage under the v1 key 'workshopState'.
 *
 * The v1 fields keep their names and meaning so a participant who started
 * under v1 resumes on the same page with the same scores:
 *   currentPage            0 welcome, 1 guide, 2..N+1 studies (seeded order), N+2 weights, N+3 results
 *   userRatings            studyId -> own rating 1-7
 *   userPredictions        studyId -> prediction 1-7
 *   paperScores            studyId -> prediction score 0-100
 *   totalScore             sum of paperScores
 *   sessionId              'session_<ms>_<base36>'
 *   hasUsedBackButton      the one-time back navigation was used
 *   celebratedPapers       studies whose score triggered the celebration
 *   pageDisplayTimestamps  studyId -> ms when the study was first shown (v1: last shown)
 *   criterionTokens        criterion -> tokens (0-20)
 * v2 adds stateVersion, room, paperTargets, paperFeedbackShown, joinedAt and a
 * few app fields (userName, paperCrowd, rankingSubmitted, finishedFromPage).
 *
 * Everything here is pure except loadState/saveState/clearState, which go
 * through lib/storage.js and never throw.
 */
import { RATING_MAX, RATING_MIN, STORAGE_KEYS, TOKEN_BUDGET } from '../lib/config.js';
import { CRITERION_KEYS, emptyAllocation } from '../lib/criteria.js';
import { SESSION_ID_PATTERN, STUDY_ID_PATTERN, USERNAME_PATTERN } from '../lib/patterns.js';
import { normaliseRoom } from '../lib/room.js';
import { safeGet, safeGetJSON, safeRemove, safeSet, safeSetJSON } from '../lib/storage.js';

export const STATE_VERSION = 2;

/** Pages before the first study: welcome (0) and guide (1). */
export const FIRST_STUDY_PAGE = 2;

/**
 * What a page index shows.
 * @param {number} page
 * @param {number} studyCount
 * @returns {{kind: 'welcome'|'guide'|'study'|'weights'|'results', studyIndex?: number}}
 */
export function describePage(page, studyCount) {
    if (page <= 0) return { kind: 'welcome' };
    if (page === 1) return { kind: 'guide' };
    if (page < FIRST_STUDY_PAGE + studyCount) {
        return { kind: 'study', studyIndex: page - FIRST_STUDY_PAGE };
    }
    if (page === weightsPage(studyCount)) return { kind: 'weights' };
    return { kind: 'results' };
}

/**
 * Page index of a study by its position in the participant's order.
 * @param {number} studyIndex 0-based
 * @returns {number}
 */
export function studyPage(studyIndex) {
    return FIRST_STUDY_PAGE + studyIndex;
}

/**
 * @param {number} studyCount
 * @returns {number} the criterion weights page
 */
export function weightsPage(studyCount) {
    return FIRST_STUDY_PAGE + studyCount;
}

/**
 * @param {number} studyCount
 * @returns {number} the results page
 */
export function resultsPage(studyCount) {
    return FIRST_STUDY_PAGE + studyCount + 1;
}

function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isScaleValue(value) {
    return Number.isInteger(value) && value >= RATING_MIN && value <= RATING_MAX;
}

/** Keeps entries whose key is a study id and whose value passes `isValid`. */
function studyMap(value, isValid) {
    if (!isPlainObject(value)) return {};
    return Object.fromEntries(
        Object.entries(value).filter(([key, entry]) => STUDY_ID_PATTERN.test(key) && isValid(entry))
    );
}

function sanitiseTokens(value) {
    const tokens = emptyAllocation();
    if (!isPlainObject(value)) return tokens;
    let total = 0;
    for (const key of CRITERION_KEYS) {
        const count = value[key];
        if (!Number.isInteger(count) || count < 0 || count > TOKEN_BUDGET) return emptyAllocation();
        tokens[key] = count;
        total += count;
    }
    return total <= TOKEN_BUDGET ? tokens : emptyAllocation();
}

function sanitiseCrowd(value) {
    return studyMap(
        value,
        (entry) =>
            isPlainObject(entry) &&
            Number.isInteger(entry.n) &&
            entry.n >= 0 &&
            (entry.mean === null || (Number.isFinite(entry.mean) && entry.n > 0))
    );
}

/**
 * Sum of the stored per-study scores for rated studies. v1's results page
 * recomputed the total the same way, so resumed totals match what v1 showed.
 * @param {Record<string, number>} paperScores
 * @param {Record<string, number>} userRatings
 * @returns {number}
 */
export function sumScores(paperScores, userRatings) {
    return Object.keys(userRatings).reduce((total, id) => total + (paperScores[id] ?? 0), 0);
}

/**
 * A fresh state for a new session.
 * @param {object} options
 * @param {string} options.sessionId
 * @param {string|null} [options.room]
 * @param {string|null} [options.userName]
 * @returns {object}
 */
export function createState({ sessionId, room = null, userName = null }) {
    return {
        stateVersion: STATE_VERSION,
        currentPage: 0,
        userRatings: {},
        userPredictions: {},
        paperScores: {},
        totalScore: 0,
        sessionId,
        hasUsedBackButton: false,
        celebratedPapers: [],
        pageDisplayTimestamps: {},
        criterionTokens: emptyAllocation(),
        room: normaliseRoom(room),
        paperTargets: {},
        paperFeedbackShown: {},
        paperCrowd: {},
        joinedAt: null,
        userName: USERNAME_PATTERN.test(userName ?? '') ? userName : null,
        rankingSubmitted: false,
        finishedFromPage: null,
    };
}

/**
 * Turns a stored v1 or v2 state into a valid v2 state. Malformed fields fall
 * back to their defaults; a missing or malformed session id means there is
 * nothing to resume, so the result is null.
 * @param {unknown} raw the parsed 'workshopState' value
 * @param {object} options
 * @param {number} options.studyCount studies in the workshop (48)
 * @param {string|null} [options.legacyUserName] the separate v1 'userName' value
 * @returns {object|null}
 */
export function migrateState(raw, { studyCount, legacyUserName = null }) {
    if (!isPlainObject(raw) || typeof raw.sessionId !== 'string') return null;
    if (!SESSION_ID_PATTERN.test(raw.sessionId)) return null;

    const userRatings = studyMap(raw.userRatings, isScaleValue);
    const rated = (map) =>
        Object.fromEntries(Object.entries(map).filter(([id]) => Object.hasOwn(userRatings, id)));
    const paperScores = rated(
        studyMap(raw.paperScores, (score) => Number.isInteger(score) && score >= 0 && score <= 100)
    );
    const lastPage = resultsPage(studyCount);
    const page = Number.isInteger(raw.currentPage) ? raw.currentPage : 0;
    const storedName = typeof raw.userName === 'string' ? raw.userName : legacyUserName;
    const finishedFrom = raw.finishedFromPage;

    return {
        ...createState({
            sessionId: raw.sessionId,
            room: raw.room ?? null,
            userName: storedName,
        }),
        currentPage: Math.min(Math.max(page, 0), lastPage),
        userRatings,
        userPredictions: rated(studyMap(raw.userPredictions, isScaleValue)),
        paperScores,
        totalScore: sumScores(paperScores, userRatings),
        hasUsedBackButton: raw.hasUsedBackButton === true,
        celebratedPapers: Array.isArray(raw.celebratedPapers)
            ? raw.celebratedPapers.filter((id) => typeof id === 'string' && STUDY_ID_PATTERN.test(id))
            : [],
        pageDisplayTimestamps: studyMap(raw.pageDisplayTimestamps, Number.isFinite),
        criterionTokens: sanitiseTokens(raw.criterionTokens),
        paperTargets: rated(
            studyMap(
                raw.paperTargets,
                (target) => Number.isFinite(target) && target >= RATING_MIN && target <= RATING_MAX
            )
        ),
        paperFeedbackShown: rated(studyMap(raw.paperFeedbackShown, (shown) => shown === true)),
        paperCrowd: rated(sanitiseCrowd(raw.paperCrowd)),
        joinedAt: Number.isFinite(raw.joinedAt) ? raw.joinedAt : null,
        rankingSubmitted: raw.rankingSubmitted === true,
        finishedFromPage:
            Number.isInteger(finishedFrom) &&
            finishedFrom >= FIRST_STUDY_PAGE &&
            finishedFrom < weightsPage(studyCount)
                ? finishedFrom
                : null,
    };
}

/**
 * Number of studies the participant has rated.
 * @param {object} state
 * @returns {number}
 */
export function ratedCount(state) {
    return Object.keys(state.userRatings).length;
}

/**
 * True when the study has a saved rating.
 * @param {object} state
 * @param {string} studyId
 * @returns {boolean}
 */
export function isRated(state, studyId) {
    return Object.hasOwn(state.userRatings, studyId);
}

/**
 * Records a saved rating. Returns a new state; the input is not modified.
 * @param {object} state
 * @param {object} rating
 * @param {string} rating.studyId
 * @param {number} rating.rating
 * @param {number} rating.prediction
 * @param {number} rating.score
 * @param {number|null} rating.target
 * @param {{n: number, mean: number|null}|null} rating.crowd
 * @param {boolean} rating.feedbackShown
 * @returns {object}
 */
export function commitRating(state, { studyId, rating, prediction, score, target, crowd, feedbackShown }) {
    const userRatings = { ...state.userRatings, [studyId]: rating };
    const paperScores = { ...state.paperScores, [studyId]: score };
    const next = {
        ...state,
        userRatings,
        userPredictions: { ...state.userPredictions, [studyId]: prediction },
        paperScores,
        totalScore: sumScores(paperScores, userRatings),
        paperTargets: { ...state.paperTargets },
        paperCrowd: { ...state.paperCrowd },
        paperFeedbackShown: { ...state.paperFeedbackShown },
    };
    if (Number.isFinite(target)) next.paperTargets[studyId] = target;
    if (crowd) next.paperCrowd[studyId] = { n: crowd.n, mean: crowd.mean };
    if (feedbackShown) next.paperFeedbackShown[studyId] = true;
    return next;
}

/**
 * Reads and migrates the stored state.
 * @param {number} studyCount
 * @returns {object|null} null when there is no session to resume
 */
export function loadState(studyCount) {
    // v1 stored the nickname as a plain string under its own key.
    const legacyUserName = safeGet(STORAGE_KEYS.userName);
    return migrateState(safeGetJSON(STORAGE_KEYS.state), { studyCount, legacyUserName });
}

/**
 * Saves the state, and the nickname under v1's separate key (the dashboard reads it).
 * @param {object} state
 * @returns {boolean} false when the browser blocks storage (kept in memory instead)
 */
export function saveState(state) {
    if (state.userName) safeSet(STORAGE_KEYS.userName, state.userName);
    return safeSetJSON(STORAGE_KEYS.state, state);
}

/**
 * Removes the saved session (for 'Start as a new participant').
 * @returns {void}
 */
export function clearState() {
    safeRemove(STORAGE_KEYS.state);
    safeRemove(STORAGE_KEYS.userName);
}
