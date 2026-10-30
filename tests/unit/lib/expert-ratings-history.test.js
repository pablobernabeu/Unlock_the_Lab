import { describe, expect, it } from 'vitest';
import history from '../../../src/content/expert-ratings-history.json' with { type: 'json' };
import current from '../../../src/content/expert-ratings.json' with { type: 'json' };
import { CONTENT_VERSION, RATING_MAX, RATING_MIN, STUDY_COUNT } from '../../../src/lib/config.js';
import {
    CONTENT_VERSIONS,
    EXPERT_RATING_HISTORY,
    expertRatingFor,
} from '../../../src/lib/content.js';

const STUDY_IDS = Array.from({ length: STUDY_COUNT }, (_, i) => `STUDY-${i + 1}`);

describe('expert-ratings-history.json', () => {
    it('has every content version from 1 to the current one', () => {
        const versions = Array.from({ length: CONTENT_VERSION }, (_, i) => String(i + 1));
        expect(Object.keys(history)).toEqual(versions);
    });

    it('gives every version a whole-number rating from 1 to 7 for each of the studies', () => {
        for (const [version, ratings] of Object.entries(history)) {
            expect(Object.keys(ratings), `version ${version}`).toEqual(STUDY_IDS);
            for (const [studyId, rating] of Object.entries(ratings)) {
                expect(Number.isInteger(rating), `${studyId} in version ${version}`).toBe(true);
                expect(rating).toBeGreaterThanOrEqual(RATING_MIN);
                expect(rating).toBeLessThanOrEqual(RATING_MAX);
            }
        }
    });

    it('holds the current ratings of src/content/expert-ratings.json under the current version', () => {
        expect(history[String(CONTENT_VERSION)]).toEqual(current);
    });

    it('keeps the version 1 ratings unchanged in version 2', () => {
        expect(history['2']).toEqual(history['1']);
    });
});

describe('expertRatingFor by content version', () => {
    it('lists the versions oldest first', () => {
        expect(CONTENT_VERSIONS).toEqual(Object.keys(history).map(Number));
        expect(CONTENT_VERSIONS.at(-1)).toBe(CONTENT_VERSION);
        expect(Object.isFrozen(EXPERT_RATING_HISTORY['1'])).toBe(true);
    });

    it('reads the rating of a study under each version', () => {
        for (const version of CONTENT_VERSIONS) {
            for (const studyId of STUDY_IDS) {
                expect(expertRatingFor(studyId, version)).toBe(history[String(version)][studyId]);
            }
        }
    });

    it('defaults to the current version', () => {
        for (const studyId of STUDY_IDS) {
            expect(expertRatingFor(studyId)).toBe(current[studyId]);
        }
    });

    it('returns null for an unknown study or version', () => {
        expect(expertRatingFor('STUDY-49', 1)).toBeNull();
        expect(expertRatingFor('STUDY-1', 0)).toBeNull();
        expect(expertRatingFor('STUDY-1', CONTENT_VERSION + 1)).toBeNull();
        expect(expertRatingFor('constructor', 1)).toBeNull();
    });
});
