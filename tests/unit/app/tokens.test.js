import { describe, expect, it } from 'vitest';
import { emptyAllocation } from '../../../src/lib/criteria.js';
import {
    allocationComplete,
    maxTokensFor,
    setTokens,
    tokensUsed,
} from '../../../src/app/tokens.js';

describe('token allocation', () => {
    it('counts the tokens used', () => {
        expect(tokensUsed(emptyAllocation())).toBe(0);
        expect(tokensUsed({ ...emptyAllocation(), title: 3, methods: 7 })).toBe(10);
    });

    it('limits a criterion to what the budget leaves', () => {
        const tokens = { ...emptyAllocation(), title: 15, methods: 2 };
        expect(maxTokensFor(tokens, 'methods')).toBe(5);
        expect(setTokens(tokens, 'methods', 9).methods).toBe(5);
        expect(setTokens(tokens, 'access', 9).access).toBe(3);
    });

    it('never goes below zero and ignores unknown criteria', () => {
        const tokens = { ...emptyAllocation(), title: 1 };
        expect(setTokens(tokens, 'title', -2).title).toBe(0);
        expect(setTokens(tokens, 'nonsense', 4)).toBe(tokens);
        expect(setTokens(tokens, 'title', Number.NaN)).toBe(tokens);
    });

    it('returns the same object when nothing changes, and a copy otherwise', () => {
        const tokens = { ...emptyAllocation(), title: 1 };
        expect(setTokens(tokens, 'title', 1)).toBe(tokens);
        const next = setTokens(tokens, 'title', 2);
        expect(next).not.toBe(tokens);
        expect(tokens.title).toBe(1);
    });

    it('is complete only when all 20 tokens are used', () => {
        expect(allocationComplete({ ...emptyAllocation(), title: 19 })).toBe(false);
        expect(allocationComplete({ ...emptyAllocation(), title: 19, source: 1 })).toBe(true);
    });
});
