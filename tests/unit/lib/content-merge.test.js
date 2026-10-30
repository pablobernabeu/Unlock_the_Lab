import { describe, expect, it } from 'vitest';
import { mergeStudies, mergeTranslation } from '../../../src/lib/content.js';

describe('mergeTranslation', () => {
    it('takes non-empty translated strings and keeps English for the rest', () => {
        const english = {
            term: 'Peer review',
            definition: 'Checked by experts.',
            extra: 'Only English',
        };
        const translated = {
            term: 'Adolygiad gan gymheiriaid',
            definition: '',
            unknown: 'ignored',
        };
        expect(mergeTranslation(english, translated)).toEqual({
            term: 'Adolygiad gan gymheiriaid',
            definition: 'Checked by experts.',
            extra: 'Only English',
        });
    });

    it('merges nested objects and arrays by position', () => {
        const english = [
            { name: 'Title', low: 'Clickbait' },
            { name: 'Access', low: 'Paywall' },
        ];
        const translated = [{ name: 'Teitl' }];
        expect(mergeTranslation(english, translated)).toEqual([
            { name: 'Teitl', low: 'Clickbait' },
            { name: 'Access', low: 'Paywall' },
        ]);
    });

    it('never takes ids, numbers or wrong types from a translation', () => {
        const english = { id: 'STUDY-1', n: 12, nested: { band: 'low', note: 'Tiny sample' } };
        const translated = { id: 'STUDY-2', n: 99, nested: 'flat' };
        expect(mergeTranslation(english, translated)).toEqual(english);
    });

    it('keeps feedback bands as codes even when a translator translates them', () => {
        const english = { criteria: { title: { band: 'low', note: 'Hype' } } };
        const translated = { criteria: { title: { band: 'isel', note: 'Gor-ddweud' } } };
        expect(mergeTranslation(english, translated)).toEqual({
            criteria: { title: { band: 'low', note: 'Gor-ddweud' } },
        });
    });
});

describe('mergeStudies', () => {
    it('matches studies by id and adds expert ratings', () => {
        const english = [
            {
                id: 'STUDY-1',
                title: 'Chocolate',
                feedback: { summary: 'Weak', criteria: { title: { band: 'low', note: 'Hype' } } },
            },
            { id: 'STUDY-2', title: 'Alloy' },
        ];
        const translated = [
            { id: 'STUDY-2', title: 'Aloi' },
            { id: 'STUDY-1', feedback: { criteria: { title: { note: 'Gor-ddweud' } } } },
        ];
        const merged = mergeStudies(english, translated);
        expect(merged[0]).toEqual({
            id: 'STUDY-1',
            title: 'Chocolate',
            feedback: { summary: 'Weak', criteria: { title: { band: 'low', note: 'Gor-ddweud' } } },
            expertRating: 1,
        });
        expect(merged[1]).toEqual({ id: 'STUDY-2', title: 'Aloi', expertRating: 6 });
    });

    it('copes with a missing translation', () => {
        expect(mergeStudies([{ id: 'STUDY-48', title: 'Magnets' }], undefined)).toEqual([
            { id: 'STUDY-48', title: 'Magnets', expertRating: 1 },
        ]);
    });
});
