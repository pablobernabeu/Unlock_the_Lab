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
 *   pageDisplayTimestamps  studyId -> ms when the study was first shown (v1: last shown,
 *                          overwritten on every display, so v1 values are dropped on migration)
 *   criterionTokens        criterion -> tokens (0-20)
 * v2 adds stateVersion, room, paperTargets, paperFeedbackShown, joinedAt and a
 * few app fields (userName, paperCrowd, rankingSubmitted, rankingKeptLocally,
 * finishedFromPage). Content version 3 adds paperVersions (studyId -> content
 * version of the answer), which migration infers for older states.
 *
 * Everything here is pure except loadState/saveState/clearState, which go
 * through lib/storage.js and never throw.
 */
import {
    CONTENT_VERSION,
    RATING_MAX,
    RATING_MIN,
    STORAGE_KEYS,
    TOKEN_BUDGET,
} from '../lib/config.js';
import { CRITERION_KEYS, emptyAllocation } from '../lib/criteria.js';
import { SESSION_ID_PATTERN, STUDY_ID_PATTERN, USERNAME_PATTERN } from '../lib/patterns.js';
import { isObject } from '../lib/records.js';
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

function isScaleValue(value) {
    return Number.isInteger(value) && value >= RATING_MIN && value <= RATING_MAX;
}

/** Keeps entries whose key is a study id and whose value passes `isValid`. */
function studyMap(value, isValid) {
    if (!isObject(value)) return {};
    return Object.fromEntries(
        Object.entries(value).filter(([key, entry]) => STUDY_ID_PATTERN.test(key) && isValid(entry))
    );
}

function sanitiseTokens(value) {
    const tokens = emptyAllocation();
    if (!isObject(value)) return tokens;
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
            isObject(entry) &&
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
        paperVersions: {},
        joinedAt: null,
        userName: USERNAME_PATTERN.test(userName ?? '') ? userName : null,
        rankingSubmitted: false,
        /** The weights could not be stored because an earlier allocation exists; kept here only. */
        rankingKeptLocally: false,
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
    if (!isObject(raw) || typeof raw.sessionId !== 'string') return null;
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
    const fromV1 = !(Number.isInteger(raw.stateVersion) && raw.stateVersion >= STATE_VERSION);
    const paperTargets = rated(
        studyMap(
            raw.paperTargets,
            (target) => Number.isFinite(target) && target >= RATING_MIN && target <= RATING_MAX
        )
    );
    const storedVersions = studyMap(
        raw.paperVersions,
        (version) => Number.isInteger(version) && version >= 1 && version <= CONTENT_VERSION
    );

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
            ? raw.celebratedPapers.filter(
                  (id) => typeof id === 'string' && STUDY_ID_PATTERN.test(id)
              )
            : [],
        // v1 stored when a study was last shown and reset it on every display, so a v1 value can be
        // days old; kept as a first-display time it would record that as the response time.
        pageDisplayTimestamps: fromV1 ? {} : studyMap(raw.pageDisplayTimestamps, Number.isFinite),
        criterionTokens: sanitiseTokens(raw.criterionTokens),
        paperTargets,
        paperFeedbackShown: rated(studyMap(raw.paperFeedbackShown, (shown) => shown === true)),
        paperCrowd: rated(sanitiseCrowd(raw.paperCrowd)),
        // States saved before content version 3 have no versions: version 1 stored no
        // targets and version 2 stored one with every answer it saved.
        paperVersions: Object.fromEntries(
            Object.keys(userRatings).map((id) => [
                id,
                storedVersions[id] ?? (!fromV1 && Object.hasOwn(paperTargets, id) ? 2 : 1),
            ])
        ),
        joinedAt: Number.isFinite(raw.joinedAt) ? raw.joinedAt : null,
        rankingSubmitted: raw.rankingSubmitted === true,
        rankingKeptLocally: raw.rankingSubmitted === true && raw.rankingKeptLocally === true,
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
export function commitRating(
    state,
    { studyId, rating, prediction, score, target, crowd, feedbackShown }
) {
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
        paperVersions: { ...state.paperVersions, [studyId]: CONTENT_VERSION },
    };
    if (Number.isFinite(target)) next.paperTargets[studyId] = target;
    if (crowd) next.paperCrowd[studyId] = { n: crowd.n, mean: crowd.mean };
    if (feedbackShown) next.paperFeedbackShown[studyId] = true;
    return next;
}

/**
 * The study page that 'Go back to rating studies' on the weights page leads
 * to: the page the participant finished early from, while some studies are
 * still unrated. Null when it is not on offer.
 * @param {object} state
 * @param {object[]} order the studies in the participant's order
 * @returns {number|null}
 */
export function keepRatingPage(state, order) {
    const page = state.finishedFromPage;
    const unrated = order.some((study) => !isRated(state, study.id));
    return unrated && Number.isInteger(page) ? page : null;
}

function earliest(a, b) {
    if (!Number.isFinite(a)) return Number.isFinite(b) ? b : null;
    return Number.isFinite(b) ? Math.min(a, b) : a;
}

/**
 * Combines two copies of one session's state, such as this tab's and the one
 * another tab of the same session has just saved, so that no progress is
 * lost: answers, scores and one-way flags (the back step used, the weights
 * saved) are joined, and `latest`, the copy changed most recently, decides the
 * rest, such as the page shown and weights not yet saved.
 * @param {object|null} base the older copy
 * @param {object} latest the newer copy
 * @returns {object} a new state (`latest` itself when `base` is another session)
 */
export function mergeStates(base, latest) {
    if (!base || base.sessionId !== latest.sessionId) return latest;
    const join = (field) => ({ ...base[field], ...latest[field] });
    const userRatings = join('userRatings');
    const paperScores = join('paperScores');
    const firstDisplay = { ...latest.pageDisplayTimestamps };
    for (const [id, time] of Object.entries(base.pageDisplayTimestamps)) {
        firstDisplay[id] = earliest(firstDisplay[id], time);
    }
    // Saved weights are final, so they (and the results page that follows them) win over an
    // allocation that another tab is still changing.
    const weights = latest.rankingSubmitted || !base.rankingSubmitted ? latest : base;
    return {
        ...latest,
        currentPage: weights.currentPage,
        userRatings,
        userPredictions: join('userPredictions'),
        paperScores,
        totalScore: sumScores(paperScores, userRatings),
        paperTargets: join('paperTargets'),
        paperCrowd: join('paperCrowd'),
        paperFeedbackShown: join('paperFeedbackShown'),
        paperVersions: join('paperVersions'),
        celebratedPapers: [
            ...latest.celebratedPapers,
            ...base.celebratedPapers.filter((id) => !latest.celebratedPapers.includes(id)),
        ],
        pageDisplayTimestamps: firstDisplay,
        hasUsedBackButton: base.hasUsedBackButton || latest.hasUsedBackButton,
        joinedAt: earliest(base.joinedAt, latest.joinedAt),
        userName: latest.userName ?? base.userName,
        room: latest.room ?? base.room,
        criterionTokens: weights.criterionTokens,
        rankingSubmitted: weights.rankingSubmitted,
        rankingKeptLocally: weights.rankingKeptLocally,
        finishedFromPage: latest.finishedFromPage ?? base.finishedFromPage,
    };
}

function canonical(value) {
    if (Array.isArray(value)) return value.map(canonical);
    if (!isObject(value)) return value;
    return Object.fromEntries(
        Object.keys(value)
            .sort()
            .map((key) => [key, canonical(value[key])])
    );
}

/**
 * True when two states hold the same values, whatever the order of their keys.
 * @param {object|null} a
 * @param {object|null} b
 * @returns {boolean}
 */
export function sameState(a, b) {
    return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
}

/**
 * True once the session has been used: it has joined the database or holds
 * answers. Its room can then no longer change.
 * @param {object} state
 * @returns {boolean}
 */
export function hasStarted(state) {
    return Number.isFinite(state.joinedAt) || ratedCount(state) > 0;
}

/**
 * The state the app starts from.
 * @param {object|null} saved the migrated saved state (loadState), null when none
 * @param {object} options
 * @param {string|null} options.urlRoom the room in a `?room=` link
 * @param {() => string} options.newSessionId makes an id for a new session
 * @param {number} options.studyCount
 * @returns {{state: object, saved: boolean, roomMismatch: string|null}} `roomMismatch` is the
 *   link's room when it differs from the room of a session already in use
 */
export function startingState(saved, { urlRoom, newSessionId, studyCount }) {
    if (!saved) {
        return {
            state: createState({ sessionId: newSessionId(), room: urlRoom }),
            saved: false,
            roomMismatch: null,
        };
    }
    let state = saved;
    let roomMismatch = null;
    if (urlRoom && urlRoom !== saved.room) {
        if (hasStarted(saved)) roomMismatch = urlRoom;
        else state = { ...state, room: urlRoom };
    }
    // Weights already saved (a reload just before the results appeared): go on to the results.
    if (state.currentPage === weightsPage(studyCount) && state.rankingSubmitted) {
        state = { ...state, currentPage: resultsPage(studyCount) };
    }
    return { state, saved: true, roomMismatch };
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
