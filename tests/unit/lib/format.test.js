import { describe, expect, it } from 'vitest';
import { formatDuration, formatPercent, formatRating, MISSING } from '../../../src/lib/format.js';

describe('formatPercent', () => {
    it('formats a 0-100 value as a whole percentage', () => {
        expect(formatPercent(87)).toBe('87%');
        expect(formatPercent(94.0833)).toBe('94%');
        expect(formatPercent(100)).toBe('100%');
    });

    it('rounds like Math.round, so it agrees with the leaderboard ties', () => {
        for (const value of [86.5, 87.5, 0.5, 1044 / 12, 1045 / 12, 2.675]) {
            expect(formatPercent(value)).toBe(`${Math.round(value)}%`);
        }
    });

    it('supports decimals', () => {
        expect(formatPercent(25.04, { decimals: 1 })).toBe('25.0%');
        expect(formatPercent(16.666, { decimals: 1 })).toBe('16.7%');
    });

    it('shows a dash for missing values', () => {
        expect(formatPercent(null)).toBe(MISSING);
        expect(formatPercent(Number.NaN)).toBe('–');
    });
});

describe('formatRating', () => {
    it('uses one decimal', () => {
        expect(formatRating(3.456)).toBe('3.5');
        expect(formatRating(4)).toBe('4.0');
        expect(formatRating(undefined)).toBe('–');
    });
});

describe('formatDuration', () => {
    it('formats seconds, minutes and hours', () => {
        expect(formatDuration(45_000)).toBe('45 secs');
        expect(formatDuration(125_000)).toBe('2 mins 5 secs');
        expect(formatDuration(120_000)).toBe('2 mins');
        expect(formatDuration(3_720_000)).toBe('1 hr 2 mins');
        expect(formatDuration(0)).toBe('0 secs');
    });

    it('shows a dash for missing or negative values', () => {
        expect(formatDuration(null)).toBe('–');
        expect(formatDuration(-1)).toBe('–');
    });
});
