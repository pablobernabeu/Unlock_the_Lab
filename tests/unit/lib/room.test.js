import { describe, expect, it } from 'vitest';
import { normaliseRoom, roomFromUrl, roomUrl } from '../../../src/lib/room.js';

describe('normaliseRoom', () => {
    it('trims and upper-cases valid codes', () => {
        expect(normaliseRoom(' oxford-1 ')).toBe('OXFORD-1');
        expect(normaliseRoom('Y9')).toBe('Y9');
        expect(normaliseRoom('A'.repeat(20))).toBe('A'.repeat(20));
    });

    it('rejects invalid codes', () => {
        for (const input of ['', 'A', '-ROOM', 'ROOM 1', 'A'.repeat(21), 'RÖOM', '<b>', null, 7]) {
            expect(normaliseRoom(input), String(input)).toBeNull();
        }
    });
});

describe('roomFromUrl', () => {
    it('reads the room parameter', () => {
        expect(roomFromUrl('https://unlock-the-lab.web.app/?room=year9')).toBe('YEAR9');
        expect(roomFromUrl(new URL('https://example.org/dashboard.html?lang=en&room=ox-2'))).toBe(
            'OX-2'
        );
    });

    it('returns null when there is no valid room', () => {
        expect(roomFromUrl('https://unlock-the-lab.web.app/')).toBeNull();
        expect(roomFromUrl('https://unlock-the-lab.web.app/?room=%3Cscript%3E')).toBeNull();
        expect(roomFromUrl('')).toBeNull();
    });
});

describe('roomUrl', () => {
    it('builds workshop and dashboard links', () => {
        expect(roomUrl('https://unlock-the-lab.web.app', 'OXFORD-1')).toBe(
            'https://unlock-the-lab.web.app/?room=OXFORD-1'
        );
        expect(roomUrl('https://unlock-the-lab.web.app', 'OXFORD-1', '/dashboard.html')).toBe(
            'https://unlock-the-lab.web.app/dashboard.html?room=OXFORD-1'
        );
    });
});
