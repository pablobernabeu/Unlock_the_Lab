import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
    EXPERT_RATINGS,
    compareStudyIds,
    expertRatingFor,
    loadContent,
    qualityBand,
    studyNumber,
} from '../../../src/lib/content.js';
import { STUDY_ID_PATTERN } from '../../../src/lib/patterns.js';

/** The seedScores object of the v1 app.js, which participants were scored against. */
// prettier-ignore
const V1_SEED_SCORES = {
    'STUDY-1': 1, 'STUDY-2': 6, 'STUDY-3': 5, 'STUDY-4': 1, 'STUDY-5': 5, 'STUDY-6': 4,
    'STUDY-7': 2, 'STUDY-8': 6, 'STUDY-9': 3, 'STUDY-10': 6, 'STUDY-11': 2, 'STUDY-12': 3,
    'STUDY-13': 5, 'STUDY-14': 5, 'STUDY-15': 3, 'STUDY-16': 5, 'STUDY-17': 2, 'STUDY-18': 4,
    'STUDY-19': 7, 'STUDY-20': 2, 'STUDY-21': 5, 'STUDY-22': 6, 'STUDY-23': 3, 'STUDY-24': 7,
    'STUDY-25': 3, 'STUDY-26': 4, 'STUDY-27': 5, 'STUDY-28': 2, 'STUDY-29': 1, 'STUDY-30': 4,
    'STUDY-31': 6, 'STUDY-32': 1, 'STUDY-33': 6, 'STUDY-34': 1, 'STUDY-35': 4, 'STUDY-36': 2,
    'STUDY-37': 6, 'STUDY-38': 2, 'STUDY-39': 7, 'STUDY-40': 1, 'STUDY-41': 6, 'STUDY-42': 2,
    'STUDY-43': 6, 'STUDY-44': 2, 'STUDY-45': 5, 'STUDY-46': 1, 'STUDY-47': 7, 'STUDY-48': 1,
};

describe('expert ratings', () => {
    const json = JSON.parse(
        readFileSync(new URL('../../../src/content/expert-ratings.json', import.meta.url), 'utf8')
    );

    it('are the v1 app.js seed scores, keyed STUDY-1 to STUDY-48 in order', () => {
        expect(json).toEqual(V1_SEED_SCORES);
        expect(Object.keys(json)).toEqual(Array.from({ length: 48 }, (_, i) => `STUDY-${i + 1}`));
        expect(EXPERT_RATINGS).toEqual(V1_SEED_SCORES);
    });

    it('use the app.js values where the v1 dashboard copy had drifted', () => {
        expect(json).toMatchObject({
            'STUDY-8': 6,
            'STUDY-14': 5,
            'STUDY-17': 2,
            'STUDY-27': 5,
            'STUDY-43': 6,
            'STUDY-44': 2,
            'STUDY-48': 1,
        });
    });

    it('are integers from 1 to 7 with the v1 distribution', () => {
        const counts = {};
        for (const rating of Object.values(json)) {
            expect(Number.isInteger(rating) && rating >= 1 && rating <= 7).toBe(true);
            counts[rating] = (counts[rating] ?? 0) + 1;
        }
        expect(counts).toEqual({ 1: 8, 2: 9, 3: 5, 4: 5, 5: 8, 6: 9, 7: 4 });
    });

    it('are looked up by id', () => {
        expect(expertRatingFor('STUDY-48')).toBe(1);
        expect(expertRatingFor('STUDY-99')).toBeNull();
        expect(expertRatingFor('constructor')).toBeNull();
    });
});

describe('qualityBand', () => {
    it('maps 1-2 to low, 3-5 to medium and 6-7 to high', () => {
        expect([1, 2, 3, 4, 5, 6, 7].map(qualityBand)).toEqual([
            'low',
            'low',
            'medium',
            'medium',
            'medium',
            'high',
            'high',
        ]);
        expect(qualityBand(0)).toBeNull();
        expect(qualityBand(null)).toBeNull();
    });

    it('labels the studies the v1 dashboard got wrong as low', () => {
        expect(
            ['STUDY-17', 'STUDY-44', 'STUDY-48'].map((id) => qualityBand(expertRatingFor(id)))
        ).toEqual(['low', 'low', 'low']);
    });
});

describe('study ids', () => {
    it('sort numerically', () => {
        expect(['STUDY-10', 'STUDY-2', 'STUDY-1', 'STUDY-19'].sort(compareStudyIds)).toEqual([
            'STUDY-1',
            'STUDY-2',
            'STUDY-10',
            'STUDY-19',
        ]);
        expect(studyNumber('STUDY-17')).toBe(17);
        expect(studyNumber('paper1')).toBeNaN();
    });

    it('put malformed ids last with a consistent order', () => {
        const ids = ['paper1', 'STUDY-10', 'STUDY-2', 'STUDY-01', 'STUDY-1'];
        const expected = ['STUDY-1', 'STUDY-2', 'STUDY-10', 'paper1', 'STUDY-01'];
        expect([...ids].sort(compareStudyIds)).toEqual(expected);
        expect([...ids].reverse().sort(compareStudyIds)).toEqual(expected);
    });
});

describe('loadContent', () => {
    it('returns the English content with expert ratings merged', async () => {
        const { studies, glossary, rubric } = await loadContent('en');
        expect(studies).toHaveLength(48);
        expect(studies.map(({ id }) => id)).toEqual(Object.keys(V1_SEED_SCORES));
        for (const study of studies) {
            expect(study.id).toMatch(STUDY_ID_PATTERN);
            expect(study.expertRating).toBe(V1_SEED_SCORES[study.id]);
            expect(typeof study.title).toBe('string');
        }
        expect(glossary.length).toBeGreaterThan(0);
        expect(rubric.length).toBe(6);
    });

    it('falls back to English for a locale without content files', async () => {
        const english = await loadContent('en');
        const unknown = await loadContent('xx');
        expect(unknown).toEqual(english);
    });

    it('caches per locale', async () => {
        expect(loadContent('en')).toBe(loadContent('en'));
    });
});
