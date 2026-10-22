import { describe, expect, it } from 'vitest';
import { normaliseEntries } from '../../../src/lib/leaderboard.js';
import {
    chartPoints,
    leaderboardView,
    othersMean,
    ownReviewRows,
    ratingProfile,
    readOnlyReviewRows,
    readOnlyTotals,
    resolveSessionParam,
    tokenShares,
    withOwnEntry,
} from '../../../src/app/results-model.js';
import { commitRating, createState } from '../../../src/app/state.js';

const SID = 'session_1790000000000_abc123def';
const studies = [
    { id: 'STUDY-1', title: 'One', expertRating: 1 },
    { id: 'STUDY-2', title: 'Two', expertRating: 6 },
    { id: 'STUDY-3', title: 'Three', expertRating: 4 },
];

describe('othersMean', () => {
    it('leaves out the participant and accepts legacy bare numbers', () => {
        const node = {
            [SID]: { rating: 7 },
            a: { rating: 2 },
            b: 4,
            c: { rating: 9 },
            d: { rating: 'x' },
        };
        expect(othersMean(node, SID)).toEqual({ n: 2, mean: 3 });
    });

    it('has no mean without other ratings', () => {
        expect(othersMean(null, SID)).toEqual({ n: 0, mean: null });
    });
});

describe('ownReviewRows', () => {
    it('lists rated studies in the participant order with their stored details', () => {
        let state = createState({ sessionId: SID });
        state = commitRating(state, {
            studyId: 'STUDY-2',
            rating: 5,
            prediction: 6,
            score: 100,
            target: 6,
            crowd: { n: 0, mean: null },
            feedbackShown: true,
        });
        state = commitRating(state, {
            studyId: 'STUDY-3',
            rating: 3,
            prediction: 4,
            score: 99,
            target: 3.95,
            crowd: { n: 5, mean: 2.8 },
            feedbackShown: true,
        });
        const order = [studies[1], studies[0], studies[2]];
        const rows = ownReviewRows(order, state);
        expect(rows.map((row) => [row.study.id, row.trial, row.score, row.target])).toEqual([
            ['STUDY-2', 1, 100, 6],
            ['STUDY-3', 2, 99, 3.95],
        ]);
        expect(rows[1].crowd).toEqual({ n: 5, mean: 2.8 });
    });

    it('reports unknown targets of v1 ratings as null', () => {
        const state = {
            ...createState({ sessionId: SID }),
            userRatings: { 'STUDY-1': 2 },
            userPredictions: { 'STUDY-1': 2 },
            paperScores: { 'STUDY-1': 88 },
        };
        const [row] = ownReviewRows(studies, state);
        expect(row.target).toBeNull();
        expect(row.crowd).toBeNull();
        expect(row.score).toBe(88);
    });
});

describe('readOnlyReviewRows', () => {
    it('reads v1 and v2 records and sorts by trial, then time', () => {
        const tree = {
            'STUDY-1': { [SID]: { rating: 2, prediction: 1, timestamp: 300 } },
            'STUDY-2': {
                [SID]: {
                    rating: 6,
                    prediction: 6,
                    timestamp: 200,
                    trial: 1,
                    score: 100,
                    target: 6,
                },
            },
            'STUDY-3': { other: { rating: 4 } },
        };
        const rows = readOnlyReviewRows(tree, SID, studies);
        expect(rows.map((row) => row.study.id)).toEqual(['STUDY-2', 'STUDY-1']);
        expect(rows[1]).toMatchObject({ rating: 2, prediction: 1, score: null, target: null });
    });

    it('accepts very old bare-number ratings', () => {
        const rows = readOnlyReviewRows({ 'STUDY-1': { [SID]: 3 } }, SID, studies);
        expect(rows[0]).toMatchObject({ rating: 3, prediction: null });
    });
});

describe('ratingProfile and chartPoints', () => {
    const rows = [
        { study: studies[0], rating: 2 },
        { study: studies[1], rating: 7 },
        { study: studies[2], rating: 5 },
    ];
    const others = {
        'STUDY-1': { n: 2, mean: 1.5 },
        'STUDY-2': { n: 4, mean: 6 },
        'STUDY-3': { n: 0, mean: null },
    };

    it('compares with the other participants and the expert', () => {
        const profile = ratingProfile(rows, others);
        expect(profile.compared).toBe(2);
        expect(profile.missing).toBe(1);
        expect(profile.meanAbsFromOthers).toBeCloseTo(0.75);
        expect(profile.meanAbsFromExpert).toBeCloseTo(1);
        expect(profile.meanSignedFromExpert).toBeCloseTo(1);
        expect(profile.direction).toBe('higher');
    });

    it('calls small average differences similar', () => {
        const close = [{ study: studies[2], rating: 4 }];
        expect(ratingProfile(close, {}).direction).toBe('similar');
        expect(ratingProfile([{ study: studies[1], rating: 4 }], {}).direction).toBe('lower');
    });

    it('plots only studies that others have rated', () => {
        expect(chartPoints(rows, others)).toEqual([
            { x: 1.5, y: 2, n: 2, studyId: 'STUDY-1', title: 'One' },
            { x: 6, y: 7, n: 4, studyId: 'STUDY-2', title: 'Two' },
        ]);
    });
});

describe('tokenShares', () => {
    it('gives each criterion its share of the budget in rubric order', () => {
        const shares = tokenShares({
            title: 2,
            access: 3,
            source: 4,
            theory: 3,
            methods: 6,
            conclusion: 2,
        });
        expect(shares.map(({ key, percent }) => [key, percent])).toEqual([
            ['title', 10],
            ['access', 15],
            ['source', 20],
            ['theory', 15],
            ['methods', 30],
            ['conclusion', 10],
        ]);
    });

    it('returns null for an incomplete allocation', () => {
        expect(
            tokenShares({ title: 1, access: 0, source: 0, theory: 0, methods: 0, conclusion: 0 })
        ).toBeNull();
        expect(tokenShares(null)).toBeNull();
    });
});

describe('withOwnEntry and leaderboardView', () => {
    const node = {
        a: { score: 950, papersRated: 10, userName: 'Red Fox 07', timestamp: 1 },
        b: { score: 1200, papersRated: 12, userName: 'Blue Owl 11', timestamp: 2, room: 'DEMO-1' },
        [SID]: { score: 500, papersRated: 6, userName: 'Kind Seal 42', timestamp: 3 },
        c: { score: 300, papersRated: 3, userName: 'Tall Deer 01', timestamp: 4 },
    };

    it('replaces a stale own entry with the local totals', () => {
        const entries = withOwnEntry(normaliseEntries(node), {
            sessionId: SID,
            userName: 'Kind Seal 42',
            score: 1000,
            papersRated: 10,
            room: 'DEMO-1',
            now: 10,
        });
        const own = entries.find((entry) => entry.sessionId === SID);
        expect(own).toMatchObject({ score: 1000, papersRated: 10, displayedAccuracy: 100 });
        expect(own.room).toBe('DEMO-1');
        expect(own.timestamp).toBe(3);
    });

    it('keeps an own entry that is already up to date', () => {
        const entries = normaliseEntries(node);
        const result = withOwnEntry(entries, {
            sessionId: SID,
            userName: 'Kind Seal 42',
            score: 500,
            papersRated: 6,
            room: null,
            now: 10,
        });
        expect(result).toBe(entries);
    });

    it('ranks by mean accuracy among entries with at least 10 studies', () => {
        const entries = withOwnEntry(normaliseEntries(node), {
            sessionId: SID,
            userName: 'Kind Seal 42',
            score: 970,
            papersRated: 10,
            room: 'DEMO-1',
            now: 10,
        });
        const everyone = leaderboardView(entries, { sessionId: SID });
        expect(everyone.top.map((entry) => [entry.sessionId, entry.rank])).toEqual([
            ['b', 1],
            [SID, 2],
            ['a', 3],
        ]);
        expect(everyone.position).toMatchObject({ rank: 2, rankedCount: 3 });
        expect(everyone.rankedCount).toBe(3);

        const room = leaderboardView(entries, { sessionId: SID, room: 'DEMO-1' });
        expect(room.top.map((entry) => entry.sessionId)).toEqual(['b', SID]);
        expect(room.position.rank).toBe(2);
    });

    it('reports no rank below 10 studies and limits the top list', () => {
        const entries = normaliseEntries(node);
        const view = leaderboardView(entries, { sessionId: SID, topN: 1 });
        expect(view.top).toHaveLength(1);
        expect(view.position.rank).toBeNull();
    });
});

describe('readOnlyTotals', () => {
    it('prefers the leaderboard entry', () => {
        expect(readOnlyTotals({ score: 1044, papersRated: 12 }, [])).toEqual({
            score: 1044,
            papersRated: 12,
        });
    });

    it('falls back to v2 per-rating scores only when every rating has one', () => {
        expect(readOnlyTotals(null, [{ score: 80 }, { score: 90 }])).toEqual({
            score: 170,
            papersRated: 2,
        });
        expect(readOnlyTotals(null, [{ score: 80 }, { score: null }])).toBeNull();
        expect(readOnlyTotals({ score: 0, papersRated: 0 }, [])).toBeNull();
    });

    it('uses the saved scores when they cover more studies than an entry left behind', () => {
        const rows = [{ score: 80 }, { score: 90 }, { score: 70 }];
        expect(readOnlyTotals({ score: 170, papersRated: 2 }, rows)).toEqual({
            score: 240,
            papersRated: 3,
        });
        expect(readOnlyTotals({ score: 250, papersRated: 3 }, rows)).toEqual({
            score: 250,
            papersRated: 3,
        });
        expect(readOnlyTotals({ score: 170, papersRated: 2 }, [...rows, { score: null }])).toEqual({
            score: 170,
            papersRated: 2,
        });
    });
});

describe('resolveSessionParam', () => {
    const entries = normaliseEntries({
        session_1771630835301_gj69lmk1o: { score: 1044, papersRated: 12, userName: 'Red Bear 76' },
        session_1771634502453_iienlw3th: { score: 50, papersRated: 1, userName: 'Tall Owl 01' },
        session_1771634502999_aaaaaaaaa: { score: 70, papersRated: 1, userName: 'Tall Owl 01' },
    });

    it('accepts a v1 session id as it is, even one not on the leaderboard', () => {
        expect(resolveSessionParam('session_1771630835301_gj69lmk1o', entries)).toEqual({
            sessionId: 'session_1771630835301_gj69lmk1o',
        });
        expect(resolveSessionParam(' SESSION_1771630835301_GJ69LMK1O ', [])).toEqual({
            sessionId: 'session_1771630835301_gj69lmk1o',
        });
    });

    it('finds a nickname exactly, ignoring case and spaces', () => {
        expect(resolveSessionParam('red bear 76', entries)).toEqual({
            sessionId: 'session_1771630835301_gj69lmk1o',
        });
        expect(resolveSessionParam('Red Bear', entries)).toBeNull();
    });

    it('offers a choice when several entries share a nickname', () => {
        const result = resolveSessionParam('Tall Owl 01', entries);
        expect(result.matches).toHaveLength(2);
    });

    it('rejects anything else, including database path characters', () => {
        expect(resolveSessionParam('', entries)).toBeNull();
        expect(resolveSessionParam('../admins', entries)).toBeNull();
        expect(resolveSessionParam(null, entries)).toBeNull();
    });
});
