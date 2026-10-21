import { describe, expect, it } from 'vitest';
import { USERNAME_PATTERN } from '../../../src/lib/patterns.js';
import {
    generateUniqueUsername,
    generateUsername,
    normaliseUsername,
} from '../../../src/lib/username.js';

function sequence(values) {
    let index = 0;
    return () => values[index++ % values.length];
}

describe('generateUsername', () => {
    it('builds adjective, animal and a two-digit number', () => {
        expect(generateUsername(sequence([0, 0, 0.07]))).toBe('Red Fox 07');
        expect(generateUsername(sequence([0.999, 0.999, 0.999]))).toBe('Peaceful Leopard 99');
    });

    it('always matches USERNAME_PATTERN', () => {
        for (let i = 0; i < 2000; i++) {
            expect(generateUsername()).toMatch(USERNAME_PATTERN);
        }
    });
});

describe('generateUniqueUsername', () => {
    it('avoids names that are already taken', () => {
        const rng = sequence([0, 0, 0.07, 0, 0, 0.08]);
        expect(generateUniqueUsername(['Red Fox 07'], rng)).toBe('Red Fox 08');
    });

    it('never assigns the reserved placeholder', () => {
        const name = generateUniqueUsername(new Set(), sequence([0.5, 0.5, 0.5]));
        expect(name).not.toBe('Anonymous');
    });

    it('falls back to a numeric suffix after 500 clashes, as v1 did', () => {
        const name = generateUniqueUsername(['Red Fox 07', 'Red Fox 07-1'], sequence([0, 0, 0.07]));
        expect(name).toBe('Red Fox 07-2');
        expect(name).toMatch(USERNAME_PATTERN);
    });

    it('accepts any iterable of existing names', () => {
        expect(generateUniqueUsername(new Set(['Blue Owl 01']))).toMatch(USERNAME_PATTERN);
        expect(generateUniqueUsername(undefined)).toMatch(USERNAME_PATTERN);
    });
});

describe('normaliseUsername', () => {
    it('ignores case and whitespace', () => {
        expect(normaliseUsername('  Red  Fox\t07 ')).toBe('redfox07');
        expect(normaliseUsername('RedFox07')).toBe('redfox07');
    });

    it('returns an empty string for non-strings', () => {
        expect(normaliseUsername(null)).toBe('');
        expect(normaliseUsername(42)).toBe('');
    });
});
