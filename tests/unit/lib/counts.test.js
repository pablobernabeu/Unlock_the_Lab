import { describe, expect, it } from 'vitest';
import { ACTIVE_WINDOW_MS, MIN_STUDIES_TO_FINISH, STUDY_COUNT } from '../../../src/lib/config.js';
import { loadContent } from '../../../src/lib/content.js';
import { countActive, isWorkshopStudy, ratingCounts } from '../../../src/lib/counts.js';

const S1 = 'session_1771630835301_gj69lmk1o';
const S2 = 'session_1771634502453_iienlw3th';
const S3 = 'session_1790362780158_vajs8e9ta';
const S4 = 'session_1800000000000_room1';

/** Every shape /ratings holds: v1 objects, bare numbers, v2 records with rooms, and junk. */
const RATINGS = {
    'STUDY-1': {
        [S1]: { rating: 2, prediction: 3, timestamp: 1, uid: 'a' },
        [S2]: 4,
        [S3]: { rating: 6, prediction: 5, room: 'DEMO-1' },
        session_bad_value: { rating: 8, prediction: 2 },
        session_zero: { rating: 0 },
        session_string: { rating: '5' },
        session_null: null,
    },
    'STUDY-2': {
        [S1]: { rating: 5, prediction: 9 },
        [S4]: { rating: 3, prediction: 4, room: 'DEMO-1' },
    },
    'STUDY-10': { [S1]: { rating: 7, prediction: 6, room: 'not a room' } },
    'STUDY-99': { [S1]: { rating: 4 } },
    'paper-1': { [S1]: { rating: 4 } },
    'STUDY-3': 'not an object',
};

/** A /ratings node in which `sessionId` rated studies 1..count. */
function ratedStudies(sessionId, count, record = { rating: 4, prediction: 4 }) {
    return Object.fromEntries(
        Array.from({ length: count }, (_, index) => [`STUDY-${index + 1}`, { [sessionId]: record }])
    );
}

function mergeRatings(...nodes) {
    const merged = {};
    for (const node of nodes) {
        for (const [studyId, sessions] of Object.entries(node)) {
            merged[studyId] = { ...merged[studyId], ...sessions };
        }
    }
    return merged;
}

describe('isWorkshopStudy', () => {
    it('accepts the workshop studies only', () => {
        expect(isWorkshopStudy('STUDY-1')).toBe(true);
        expect(isWorkshopStudy(`STUDY-${STUDY_COUNT}`)).toBe(true);
        expect(isWorkshopStudy(`STUDY-${STUDY_COUNT + 1}`)).toBe(false);
        expect(isWorkshopStudy('STUDY-99')).toBe(false);
        expect(isWorkshopStudy('STUDY-0')).toBe(false);
        expect(isWorkshopStudy('STUDY-01')).toBe(false);
        expect(isWorkshopStudy('paper-1')).toBe(false);
    });

    it('matches the studies in the content, the ones the dashboard table lists', async () => {
        const { studies } = await loadContent('en');
        const ids = studies.map(({ id }) => id);
        expect(ids.every(isWorkshopStudy)).toBe(true);
        expect(ids).toHaveLength(STUDY_COUNT);
    });
});

describe('ratingCounts', () => {
    it('counts sessions with a rating, valid ratings and sessions with enough ratings', () => {
        expect(ratingCounts(RATINGS, { minStudies: 2 })).toEqual({
            participants: 4,
            ratings: 6,
            completed: 1,
        });
    });

    it('uses the finishing threshold by default', () => {
        const ratings = mergeRatings(
            ratedStudies(S1, MIN_STUDIES_TO_FINISH),
            ratedStudies(S2, MIN_STUDIES_TO_FINISH - 1)
        );
        expect(ratingCounts(ratings)).toEqual({
            participants: 2,
            ratings: 2 * MIN_STUDIES_TO_FINISH - 1,
            completed: 1,
        });
        expect(ratingCounts(ratedStudies(S1, 3), { minStudies: 3 }).completed).toBe(1);
    });

    it('accepts legacy bare-number ratings and skips invalid ones and bad study ids', () => {
        const ratings = {
            'STUDY-1': { legacy: 5, broken: { rating: 0 }, text: { rating: '4' } },
            'STUDY-2': { legacy: { rating: 7, prediction: 6 } },
            'paper-3': { legacy: { rating: 3 } },
        };
        expect(ratingCounts(ratings)).toEqual({ participants: 1, ratings: 2, completed: 0 });
    });

    it('leaves out studies the workshop does not have', () => {
        // The rules accept ids up to STUDY-99, so such records can exist.
        const ratings = { 'STUDY-1': { a: 4 }, 'STUDY-77': { a: 4, b: 5 } };
        expect(ratingCounts(ratings)).toEqual({ participants: 1, ratings: 1, completed: 0 });
    });

    it('counts only ratings made in the selected room, with v1 records in no room', () => {
        expect(ratingCounts(RATINGS, { room: 'DEMO-1', minStudies: 1 })).toEqual({
            participants: 2,
            ratings: 2,
            completed: 2,
        });
        expect(ratingCounts(RATINGS, { room: 'OTHER' })).toEqual({
            participants: 0,
            ratings: 0,
            completed: 0,
        });
    });

    it('ignores study nodes that are not objects, as the dashboard always has', () => {
        // A node whose keys are all small integers would arrive as an array;
        // session ids never are, so such a node holds no genuine ratings.
        expect(ratingCounts({ 'STUDY-1': [4, 5], 'STUDY-2': { [S1]: 3 } })).toEqual({
            participants: 1,
            ratings: 1,
            completed: 0,
        });
    });

    it('returns zeros for an empty or malformed database', () => {
        for (const node of [null, undefined, 5, 'text', []]) {
            expect(ratingCounts(node)).toEqual({ participants: 0, ratings: 0, completed: 0 });
        }
    });
});

describe('countActive', () => {
    const now = 1_800_000_000_000;
    const node = {
        a: { lastActive: now - 1000, joinedAt: now - 5000 },
        b: { lastActive: now - ACTIVE_WINDOW_MS },
        c: { lastActive: now - ACTIVE_WINDOW_MS - 1 },
        d: { lastActive: now + ACTIVE_WINDOW_MS + 1 },
        e: { joinedAt: now },
        f: 'junk',
        g: { lastActive: now, room: 'DEMO-1' },
        h: { lastActive: '1800000000000' },
    };

    it('counts heartbeats inside the window and ignores impossible ones', () => {
        expect(countActive(node, { now })).toBe(3);
    });

    it('filters by room', () => {
        expect(countActive(node, { now, room: 'DEMO-1' })).toBe(1);
        expect(countActive(node, { now, room: 'OTHER' })).toBe(0);
    });

    it('takes the window as an option and copes with a missing or malformed node', () => {
        expect(countActive(node, { now, windowMs: 500 })).toBe(1);
        expect(countActive(null, { now })).toBe(0);
        expect(countActive([{ lastActive: now }], { now })).toBe(0);
    });
});
