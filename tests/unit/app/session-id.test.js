import { describe, expect, it } from 'vitest';
import { generateSessionId } from '../../../src/app/session-id.js';
import { SESSION_ID_PATTERN } from '../../../src/lib/patterns.js';

describe('generateSessionId', () => {
    it('matches the v1 format checked by the database rules', () => {
        for (let i = 0; i < 200; i++) expect(generateSessionId()).toMatch(SESSION_ID_PATTERN);
    });

    it('uses the time and nine base-36 characters', () => {
        const bytes = Uint8Array.from([0, 1, 10, 35, 36, 71, 200, 251, 13]);
        const id = generateSessionId({ now: 1771630835301, randomBytes: () => bytes });
        expect(id).toBe('session_1771630835301_01az0zkzd');
    });

    it('skips bytes that would make some characters more likely', () => {
        let call = 0;
        const randomBytes = (count) => {
            call += 1;
            return Uint8Array.from({ length: count }, (_, index) =>
                call === 1 && index % 2 === 0 ? 255 : 1
            );
        };
        const id = generateSessionId({ now: 1771630835301, randomBytes });
        expect(id).toBe('session_1771630835301_111111111');
        expect(call).toBe(2);
    });
});
