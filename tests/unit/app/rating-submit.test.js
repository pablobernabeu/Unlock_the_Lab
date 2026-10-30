import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fake } from './fake-database.js';
import { CONTENT_VERSION } from '../../../src/lib/config.js';

vi.mock('firebase/database', () => import('./fake-database.js').then((m) => m.databaseModule));
vi.mock('../../../src/lib/firebase.js', () =>
    import('./fake-database.js').then((m) => m.firebaseModule)
);

const { submitRating } = await import('../../../src/app/rating-submit.js');
const { savedResult } = await import('../../../src/app/views/study.js');

const SID = 'session_1800000000000_abc123';
const STUDY = { id: 'STUDY-13', expertRating: 4 };
const RECORD = `ratings/STUDY-13/${SID}`;

function submit() {
    return submitRating({
        study: STUDY,
        sessionId: SID,
        uid: 'uid-1',
        rating: 4,
        prediction: 4,
        responseTime: 30_000,
        trial: 1,
        locale: 'en',
        room: null,
    });
}

beforeEach(() => {
    fake.reset();
    vi.clearAllMocks();
});

describe('submitRating', () => {
    it('reports a new answer as one of the current content version', async () => {
        const result = await submit();
        expect(result.contentVersion).toBe(CONTENT_VERSION);
        expect(fake.read(RECORD).contentVersion).toBe(CONTENT_VERSION);
    });

    it('returns an answer stored by an earlier version with that version', async () => {
        // Saved by the version 2 app, whose acknowledgement was lost before the update.
        fake.write(RECORD, {
            rating: 5,
            prediction: 5,
            target: 5,
            score: 100,
            uid: 'uid-1',
            contentVersion: 2,
        });
        fake.refuse('set', RECORD);
        const result = await submit();
        expect(result).toMatchObject({ rating: 5, target: 5, score: 100, contentVersion: 2 });
        // The make-up of a target from another version is not described.
        expect(result.crowd).toBeNull();
    });
});

describe('savedResult', () => {
    const state = {
        userRatings: { 'STUDY-13': 5, 'STUDY-2': 6 },
        userPredictions: { 'STUDY-13': 5, 'STUDY-2': 6 },
        paperScores: { 'STUDY-13': 100, 'STUDY-2': 100 },
        paperTargets: { 'STUDY-13': 5, 'STUDY-2': 6 },
        paperCrowd: {},
        paperVersions: { 'STUDY-13': 2, 'STUDY-2': CONTENT_VERSION },
    };

    it('gives an earlier answer the expert rating its target was made from', () => {
        expect(savedResult(state, 'STUDY-13').expertRating).toBe(5);
    });

    it("leaves a current answer to the study's own expert rating", () => {
        expect(savedResult(state, 'STUDY-2').expertRating).toBeNull();
    });
});
