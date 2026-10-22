import { describe, expect, it } from 'vitest';
import { markFirstDisplay, responseTimeFor } from '../../../src/app/response-time.js';

describe('markFirstDisplay', () => {
    it('records the first display of a study', () => {
        expect(markFirstDisplay({}, 'STUDY-4', 1000)).toEqual({ 'STUDY-4': 1000 });
    });

    it('keeps the earlier time when the study is shown again (reload, back button, pause)', () => {
        const timestamps = { 'STUDY-4': 1000 };
        const again = markFirstDisplay(timestamps, 'STUDY-4', 9000);
        expect(again).toBe(timestamps);
        expect(again['STUDY-4']).toBe(1000);
    });

    it('does not modify the input', () => {
        const timestamps = Object.freeze({ 'STUDY-1': 5 });
        expect(markFirstDisplay(timestamps, 'STUDY-2', 7)).toEqual({ 'STUDY-1': 5, 'STUDY-2': 7 });
    });

    it('copes with a missing map', () => {
        expect(markFirstDisplay(undefined, 'STUDY-1', 7)).toEqual({ 'STUDY-1': 7 });
    });
});

describe('responseTimeFor', () => {
    it('measures from the first display to the submission', () => {
        let timestamps = markFirstDisplay({}, 'STUDY-4', 1000);
        timestamps = markFirstDisplay(timestamps, 'STUDY-4', 50000);
        expect(responseTimeFor(timestamps, 'STUDY-4', 61000.4)).toBe(60000);
    });

    it('is unknown without a record or when the clock moved backwards', () => {
        expect(responseTimeFor({}, 'STUDY-4', 1000)).toBeNull();
        expect(responseTimeFor({ 'STUDY-4': 5000 }, 'STUDY-4', 1000)).toBeNull();
        expect(responseTimeFor(null, 'STUDY-4', 1000)).toBeNull();
    });
});
