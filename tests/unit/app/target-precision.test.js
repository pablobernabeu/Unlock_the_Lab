import { describe, expect, it } from 'vitest';
import { MAX_TARGET_DIGITS, roundTarget, targetDigits } from '../../../src/app/target-precision.js';
import { SEED_WEIGHT } from '../../../src/lib/config.js';
import { predictionScore, scoringTarget } from '../../../src/lib/scoring.js';

describe('roundTarget', () => {
    it('rounds halves away from zero, as the page shows them', () => {
        expect(roundTarget(1.125, 2)).toBe(1.13);
        expect(roundTarget(4.875, 2)).toBe(4.88);
        expect(roundTarget(1.125, 3)).toBe(1.125);
        expect(roundTarget(5, 2)).toBe(5);
    });
});

describe('targetDigits', () => {
    it('keeps two decimals when they give the same score', () => {
        expect(targetDigits(5.0099, 4, predictionScore(4, 5.0099))).toBe(2);
        expect(targetDigits(4, 4, 100)).toBe(2);
    });

    it('adds a decimal where two would point to another score', () => {
        // Four other ratings summing to 17 and an expert rating of 1 make a target of 1.125.
        const { target } = scoringTarget([7, 5, 3, 2], 1);
        expect(target).toBe(1.125);
        expect(predictionScore(2, target)).toBe(89);
        expect(predictionScore(2, roundTarget(target, 2))).toBe(90);
        expect(targetDigits(target, 2, 89)).toBe(3);
    });

    it('shows every reachable target so that the rule gives the stored score', () => {
        const wrong = [];
        let widened = 0;
        for (let others = 0; others <= 60; others += 1) {
            for (let expert = 1; expert <= 7; expert += 1) {
                for (let sum = others; sum <= 7 * others; sum += 1) {
                    const target = (sum + expert * SEED_WEIGHT) / (others + SEED_WEIGHT);
                    for (let prediction = 1; prediction <= 7; prediction += 1) {
                        const score = predictionScore(prediction, target);
                        const digits = targetDigits(target, prediction, score);
                        if (digits > 2) widened += 1;
                        const shown = roundTarget(target, digits);
                        if (predictionScore(prediction, shown) !== score) {
                            wrong.push({ others, expert, sum, prediction });
                        }
                    }
                }
            }
        }
        expect(wrong).toEqual([]);
        expect(widened).toBeGreaterThan(0);
    });

    it('uses two decimals when the prediction or the score is unknown', () => {
        expect(targetDigits(1.125, null, 89)).toBe(2);
        expect(targetDigits(1.125, 2, null)).toBe(2);
        expect(targetDigits(Number.NaN, 2, 89)).toBe(2);
    });

    it('gives up at the most decimals for a score the target cannot produce', () => {
        expect(targetDigits(1.125, 2, 50)).toBe(2);
        expect(MAX_TARGET_DIGITS).toBe(6);
    });
});
