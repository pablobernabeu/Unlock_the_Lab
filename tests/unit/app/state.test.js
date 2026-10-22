import { describe, expect, it } from 'vitest';
import { SESSION_ID_PATTERN } from '../../../src/lib/patterns.js';
import { seededShuffle } from '../../../src/lib/shuffle.js';
import {
    STATE_VERSION,
    commitRating,
    createState,
    describePage,
    isRated,
    migrateState,
    ratedCount,
    resultsPage,
    startingState,
    studyPage,
    sumScores,
    weightsPage,
} from '../../../src/app/state.js';

const STUDY_COUNT = 48;
const STUDY_IDS = Array.from({ length: STUDY_COUNT }, (_, index) => `STUDY-${index + 1}`);

/**
 * A state as v1's saveState() wrote it (legacy app.js), for the session
 * 'Curious Hawk 71' in the v1 snapshot: four studies rated, on the fifth.
 */
const V1_STATE = {
    currentPage: 6,
    userRatings: { 'STUDY-8': 6, 'STUDY-6': 2, 'STUDY-41': 7, 'STUDY-27': 7 },
    userPredictions: { 'STUDY-8': 5, 'STUDY-6': 3, 'STUDY-41': 7, 'STUDY-27': 6 },
    paperScores: { 'STUDY-8': 88, 'STUDY-6': 88, 'STUDY-41': 88, 'STUDY-27': 88 },
    totalScore: 352,
    sessionId: 'session_1790362780158_vajs8e9ta',
    hasUsedBackButton: false,
    celebratedPapers: [],
    pageDisplayTimestamps: {
        'STUDY-8': 1790363259727,
        'STUDY-6': 1790363447905,
        'STUDY-41': 1790363506715,
        'STUDY-27': 1790363565882,
        'STUDY-47': 1790363617600,
    },
    criterionTokens: { title: 0, access: 0, source: 0, theory: 0, methods: 0, conclusion: 0 },
};

describe('page indices (v1 semantics)', () => {
    it('maps pages to views: 0 welcome, 1 guide, 2..N+1 studies, N+2 weights, N+3 results', () => {
        expect(describePage(0, STUDY_COUNT)).toEqual({ kind: 'welcome' });
        expect(describePage(1, STUDY_COUNT)).toEqual({ kind: 'guide' });
        expect(describePage(2, STUDY_COUNT)).toEqual({ kind: 'study', studyIndex: 0 });
        expect(describePage(49, STUDY_COUNT)).toEqual({ kind: 'study', studyIndex: 47 });
        expect(describePage(50, STUDY_COUNT)).toEqual({ kind: 'weights' });
        expect(describePage(51, STUDY_COUNT)).toEqual({ kind: 'results' });
        expect(studyPage(0)).toBe(2);
        expect(weightsPage(STUDY_COUNT)).toBe(50);
        expect(resultsPage(STUDY_COUNT)).toBe(51);
    });

    it('treats negative pages as the welcome page and pages past the end as results', () => {
        expect(describePage(-3, STUDY_COUNT).kind).toBe('welcome');
        expect(describePage(99, STUDY_COUNT).kind).toBe('results');
    });
});

describe('migrateState from v1', () => {
    const migrated = migrateState(structuredClone(V1_STATE), {
        studyCount: STUDY_COUNT,
        legacyUserName: 'Curious Hawk 71',
    });

    it('keeps the session, the page, the answers and the scores', () => {
        expect(migrated.stateVersion).toBe(STATE_VERSION);
        expect(migrated.sessionId).toBe(V1_STATE.sessionId);
        expect(migrated.currentPage).toBe(6);
        expect(migrated.userRatings).toEqual(V1_STATE.userRatings);
        expect(migrated.userPredictions).toEqual(V1_STATE.userPredictions);
        expect(migrated.paperScores).toEqual(V1_STATE.paperScores);
        expect(migrated.totalScore).toBe(352);
        expect(ratedCount(migrated)).toBe(4);
    });

    it('drops the v1 display times, which v1 reset on every display (last shown, not first)', () => {
        // Kept as first-display times, a study left open under v1 months ago would be saved
        // with a response time of months; the study's next display records a fresh time instead.
        expect(migrated.pageDisplayTimestamps).toEqual({});
    });

    it('shows the same study on the same page because the seeded order is unchanged', () => {
        const order = seededShuffle(STUDY_IDS, migrated.sessionId);
        const { studyIndex } = describePage(migrated.currentPage, STUDY_COUNT);
        expect(order.slice(0, 4)).toEqual(['STUDY-8', 'STUDY-6', 'STUDY-41', 'STUDY-27']);
        expect(order[studyIndex]).toBe('STUDY-47');
        expect(isRated(migrated, order[studyIndex])).toBe(false);
    });

    it('adopts the separate v1 userName key and adds the v2 fields with defaults', () => {
        expect(migrated.userName).toBe('Curious Hawk 71');
        expect(migrated.room).toBeNull();
        expect(migrated.paperTargets).toEqual({});
        expect(migrated.paperFeedbackShown).toEqual({});
        expect(migrated.paperCrowd).toEqual({});
        expect(migrated.joinedAt).toBeNull();
        expect(migrated.rankingSubmitted).toBe(false);
    });

    it('recomputes the total from the per-study scores, as v1 did on its results page', () => {
        const drifted = { ...structuredClone(V1_STATE), totalScore: 999 };
        expect(migrateState(drifted, { studyCount: STUDY_COUNT }).totalScore).toBe(352);
    });

    it('accepts v1 defaults written by `|| 0` and `|| {}` and a missing page', () => {
        const sparse = { sessionId: V1_STATE.sessionId };
        const result = migrateState(sparse, { studyCount: STUDY_COUNT });
        expect(result.currentPage).toBe(0);
        expect(result.userRatings).toEqual({});
        expect(result.totalScore).toBe(0);
        expect(result.criterionTokens).toEqual({
            title: 0,
            access: 0,
            source: 0,
            theory: 0,
            methods: 0,
            conclusion: 0,
        });
    });

    it('keeps a v1 token allocation and drops an impossible one', () => {
        const tokens = { title: 2, access: 3, source: 4, theory: 3, methods: 6, conclusion: 2 };
        const kept = migrateState(
            { ...structuredClone(V1_STATE), criterionTokens: tokens },
            { studyCount: STUDY_COUNT }
        );
        expect(kept.criterionTokens).toEqual(tokens);
        const tooMany = migrateState(
            { ...structuredClone(V1_STATE), criterionTokens: { ...tokens, title: 15 } },
            { studyCount: STUDY_COUNT }
        );
        expect(tooMany.criterionTokens.title).toBe(0);
    });

    it('drops malformed entries instead of failing', () => {
        const messy = {
            ...structuredClone(V1_STATE),
            userRatings: { ...V1_STATE.userRatings, 'STUDY-9': 9, bogus: 3, 'STUDY-10': '4' },
            paperScores: { ...V1_STATE.paperScores, 'STUDY-9': 50, 'STUDY-12': 101 },
            celebratedPapers: ['STUDY-8', 42, '<img>'],
            currentPage: 'seven',
        };
        const result = migrateState(messy, { studyCount: STUDY_COUNT });
        expect(Object.keys(result.userRatings)).toEqual(Object.keys(V1_STATE.userRatings));
        expect(result.paperScores).toEqual(V1_STATE.paperScores);
        expect(result.celebratedPapers).toEqual(['STUDY-8']);
        expect(result.currentPage).toBe(0);
    });

    it('clamps a page beyond the results page', () => {
        const result = migrateState(
            { ...structuredClone(V1_STATE), currentPage: 80 },
            { studyCount: STUDY_COUNT }
        );
        expect(result.currentPage).toBe(resultsPage(STUDY_COUNT));
    });

    it('returns null when there is nothing to resume', () => {
        expect(migrateState(null, { studyCount: STUDY_COUNT })).toBeNull();
        expect(migrateState('text', { studyCount: STUDY_COUNT })).toBeNull();
        expect(migrateState({ currentPage: 4 }, { studyCount: STUDY_COUNT })).toBeNull();
        expect(migrateState({ sessionId: 'session_1_x' }, { studyCount: STUDY_COUNT })).toBeNull();
    });

    it('rejects a nickname that the database rules would refuse', () => {
        const result = migrateState(structuredClone(V1_STATE), {
            studyCount: STUDY_COUNT,
            legacyUserName: '<b>Hacker</b>',
        });
        expect(result.userName).toBeNull();
    });
});

describe('migrateState from v2', () => {
    it('round-trips a v2 state unchanged', () => {
        let state = createState({
            sessionId: 'session_1790000000000_abc123def',
            room: 'demo-1',
            userName: 'Red Fox 07',
        });
        state = commitRating(state, {
            studyId: 'STUDY-3',
            rating: 4,
            prediction: 5,
            score: 88,
            target: 4.04,
            crowd: { n: 3, mean: 4.33 },
            feedbackShown: true,
        });
        state = {
            ...state,
            currentPage: 3,
            joinedAt: 1790000000500,
            rankingSubmitted: false,
            finishedFromPage: 3,
            pageDisplayTimestamps: { 'STUDY-3': 1790000000600, 'STUDY-9': 1790000090000 },
        };
        const copy = migrateState(JSON.parse(JSON.stringify(state)), { studyCount: STUDY_COUNT });
        expect(copy).toEqual(state);
        expect(copy.pageDisplayTimestamps['STUDY-9']).toBe(1790000090000);
        expect(copy.room).toBe('DEMO-1');
    });
});

describe('createState', () => {
    it('starts on the welcome page with nothing rated', () => {
        const state = createState({ sessionId: 'session_1790000000000_abc123def' });
        expect(state.currentPage).toBe(0);
        expect(ratedCount(state)).toBe(0);
        expect(state.sessionId).toMatch(SESSION_ID_PATTERN);
        expect(state.room).toBeNull();
    });

    it('ignores an invalid room code', () => {
        expect(createState({ sessionId: 'session_1_a', room: 'a b' }).room).toBeNull();
    });
});

describe('commitRating', () => {
    const base = createState({ sessionId: 'session_1790000000000_abc123def' });

    it('records the answers, the score, the target and the crowd without changing the input', () => {
        const next = commitRating(base, {
            studyId: 'STUDY-1',
            rating: 2,
            prediction: 1,
            score: 100,
            target: 1,
            crowd: { n: 0, mean: null },
            feedbackShown: true,
        });
        expect(base.userRatings).toEqual({});
        expect(next.userRatings).toEqual({ 'STUDY-1': 2 });
        expect(next.userPredictions).toEqual({ 'STUDY-1': 1 });
        expect(next.paperScores).toEqual({ 'STUDY-1': 100 });
        expect(next.paperTargets).toEqual({ 'STUDY-1': 1 });
        expect(next.paperCrowd).toEqual({ 'STUDY-1': { n: 0, mean: null } });
        expect(next.paperFeedbackShown).toEqual({ 'STUDY-1': true });
        expect(next.totalScore).toBe(100);
    });

    it('adds to the total', () => {
        const once = commitRating(base, {
            studyId: 'STUDY-1',
            rating: 2,
            prediction: 1,
            score: 100,
            target: 1,
            crowd: null,
            feedbackShown: true,
        });
        const twice = commitRating(once, {
            studyId: 'STUDY-2',
            rating: 5,
            prediction: 5,
            score: 76,
            target: 3,
            crowd: null,
            feedbackShown: false,
        });
        expect(twice.totalScore).toBe(176);
        expect(twice.paperCrowd).toEqual({});
        expect(twice.paperFeedbackShown).toEqual({ 'STUDY-1': true });
    });
});

describe('sumScores', () => {
    it('counts only rated studies and treats a missing score as 0', () => {
        expect(sumScores({ 'STUDY-1': 80, 'STUDY-2': 70 }, { 'STUDY-1': 3, 'STUDY-3': 4 })).toBe(
            80
        );
    });
});

describe('startingState', () => {
    const newSessionId = () => 'session_1790000000000_newone123';
    const options = { urlRoom: null, newSessionId, studyCount: STUDY_COUNT };
    const v1 = () => migrateState(structuredClone(V1_STATE), { studyCount: STUDY_COUNT });

    it('creates a new session in the linked room when nothing is saved', () => {
        const result = startingState(null, { ...options, urlRoom: 'DEMO-1' });
        expect(result.saved).toBe(false);
        expect(result.state.sessionId).toBe('session_1790000000000_newone123');
        expect(result.state.room).toBe('DEMO-1');
    });

    it('resumes a saved session unchanged', () => {
        const result = startingState(v1(), options);
        expect(result).toMatchObject({ saved: true, roomMismatch: null });
        expect(result.state).toEqual(v1());
    });

    it('keeps the room of a session in use and reports a different room in the link', () => {
        const result = startingState(v1(), { ...options, urlRoom: 'DEMO-1' });
        expect(result.state.room).toBeNull();
        expect(result.roomMismatch).toBe('DEMO-1');
    });

    it('moves a saved session that has not started yet into the linked room', () => {
        const unused = createState({ sessionId: 'session_1790000000000_abc123def' });
        const result = startingState(
            { ...unused, currentPage: 1 },
            { ...options, urlRoom: 'DEMO-1' }
        );
        expect(result.state.room).toBe('DEMO-1');
        expect(result.roomMismatch).toBeNull();
    });

    it('goes on to the results when the weights were already saved', () => {
        const done = { ...v1(), currentPage: weightsPage(STUDY_COUNT), rankingSubmitted: true };
        expect(startingState(done, options).state.currentPage).toBe(resultsPage(STUDY_COUNT));
        const notDone = { ...done, rankingSubmitted: false };
        expect(startingState(notDone, options).state.currentPage).toBe(weightsPage(STUDY_COUNT));
    });
});
