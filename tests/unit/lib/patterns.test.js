import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as patterns from '../../../src/lib/patterns.js';

const rules = JSON.parse(
    readFileSync(new URL('../../../database.rules.json', import.meta.url), 'utf8')
);

/** Every string in the rules file (rule expressions hold the regex literals). */
function ruleStrings(node, found = []) {
    if (typeof node === 'string') found.push(node);
    else if (node && typeof node === 'object')
        Object.values(node).forEach((child) => ruleStrings(child, found));
    return found;
}

describe('patterns match database.rules.json', () => {
    it('reads the v2 rules', () => {
        expect(rules.rules.sessions).toBeDefined();
    });

    const expressions = ruleStrings(rules).join('\n');
    for (const [name, pattern] of Object.entries(patterns)) {
        it(`${name} appears verbatim in the rules`, () => {
            expect(expressions, `/${pattern.source}/ not found in database.rules.json`).toContain(
                `/${pattern.source}/`
            );
        });
    }

    it('uses no regular expression that patterns.js lacks', () => {
        // A rule with its own variant of a pattern would accept or refuse what the app does not.
        const known = new Set(Object.values(patterns).map((pattern) => `/${pattern.source}/`));
        const inRules = [...expressions.matchAll(/\.matches\((\/.*?\/)[a-z]*\)/g)].map(
            ([, literal]) => literal
        );
        expect(inRules.length).toBeGreaterThan(0);
        expect(inRules.filter((literal) => !known.has(literal))).toEqual([]);
    });
});

describe('pattern behaviour', () => {
    it('USERNAME_PATTERN accepts generated names and the v1 suffix fallback only', () => {
        for (const name of [
            'Red Bear 76',
            'Curious Penguin 83',
            'Tall Rabbit 07',
            'Red Fox 07-12',
            'Teal Raccoon 00',
            'Peaceful Leopard 99-123',
        ]) {
            expect(name).toMatch(patterns.USERNAME_PATTERN);
        }
        for (const name of [
            '',
            'Anonymous',
            'red fox 07',
            'Red Fox 7',
            'Red Fox 007',
            '<img src=x>',
            'Red Fox 07-1234',
            'Red Fox 07-1000',
            'Smelly Teacher 12',
            'Red Teacher 12',
            'Smelly Fox 12',
            'Redd Fox 12',
            'Red Foxes 12',
        ]) {
            expect(name).not.toMatch(patterns.USERNAME_PATTERN);
        }
    });

    it('SESSION_ID_PATTERN accepts v1 session ids', () => {
        expect('session_1771630835301_gj69lmk1o').toMatch(patterns.SESSION_ID_PATTERN);
        expect(`session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`).toMatch(
            patterns.SESSION_ID_PATTERN
        );
        for (const id of [
            'session_123_abc',
            "session_1771630835301_x');alert(1)//",
            'Red Fox 07',
        ]) {
            expect(id).not.toMatch(patterns.SESSION_ID_PATTERN);
        }
    });

    it('STUDY_ID_PATTERN accepts STUDY-1 to STUDY-99 only', () => {
        expect('STUDY-1').toMatch(patterns.STUDY_ID_PATTERN);
        expect('STUDY-48').toMatch(patterns.STUDY_ID_PATTERN);
        for (const id of ['STUDY-0', 'STUDY-01', 'STUDY-100', 'study-1', 'paper1']) {
            expect(id).not.toMatch(patterns.STUDY_ID_PATTERN);
        }
    });

    it('ROOM_PATTERN accepts short upper-case codes', () => {
        expect('OXFORD-1').toMatch(patterns.ROOM_PATTERN);
        expect('-A').not.toMatch(patterns.ROOM_PATTERN);
        expect('oxford').not.toMatch(patterns.ROOM_PATTERN);
    });

    it('LOCALE_PATTERN and APP_VERSION_PATTERN accept the values the app writes', () => {
        expect('en').toMatch(patterns.LOCALE_PATTERN);
        expect('pt-BR').toMatch(patterns.LOCALE_PATTERN);
        expect('english').not.toMatch(patterns.LOCALE_PATTERN);
        expect('2.0.0').toMatch(patterns.APP_VERSION_PATTERN);
        expect('0.0.0-dev').toMatch(patterns.APP_VERSION_PATTERN);
    });
});
