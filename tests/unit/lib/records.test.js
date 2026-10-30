import { describe, expect, it } from 'vitest';
import { inRoom, isObject, recordRoom } from '../../../src/lib/records.js';

describe('isObject', () => {
    it('is true for object records only', () => {
        expect(isObject({})).toBe(true);
        expect(isObject({ rating: 4 })).toBe(true);
        for (const value of [null, undefined, 0, 4, '', 'text', [], [{ rating: 4 }], true]) {
            expect(isObject(value)).toBe(false);
        }
    });
});

describe('recordRoom and inRoom', () => {
    it('reads valid room codes only', () => {
        expect(recordRoom({ room: 'DEMO-1' })).toBe('DEMO-1');
        expect(recordRoom({ room: 'demo-1' })).toBeNull();
        expect(recordRoom({ room: '<b>' })).toBeNull();
        expect(recordRoom({ rating: 4 })).toBeNull();
        expect(recordRoom(4)).toBeNull();
        expect(recordRoom(null)).toBeNull();
        expect(recordRoom([{ room: 'DEMO-1' }])).toBeNull();
    });

    it('keeps everything when no room is selected and v1 records only then', () => {
        expect(inRoom({ rating: 4 }, null)).toBe(true);
        expect(inRoom(4, null)).toBe(true);
        expect(inRoom({ rating: 4 }, 'DEMO-1')).toBe(false);
        expect(inRoom({ room: 'DEMO-1' }, 'DEMO-1')).toBe(true);
        expect(inRoom({ room: 'OTHER' }, 'DEMO-1')).toBe(false);
    });
});
