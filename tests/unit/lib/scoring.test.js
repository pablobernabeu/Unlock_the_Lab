import { describe, expect, it } from 'vitest';
import { SCORE_PENALTY, SEED_WEIGHT } from '../../../src/lib/config.js';
import {
    displayedAccuracy,
    isValidRating,
    meanAccuracy,
    predictionScore,
    scoreBand,
    scoringTarget,
    validRatings,
} from '../../../src/lib/scoring.js';

/**
 * v1 reference: the scoring path of submitRating and showResults in the v1
 * app.js, with the Firebase read replaced by `currentRatings` (the ratings
 * node before the participant's own rating is written).
 */
function v1Score(currentRatings, seedScore, userPrediction) {
    const seedWeight = 100;
    function extractValidRatings(ratingsData) {
        if (!ratingsData || typeof ratingsData !== 'object') {
            return [];
        }

        return Object.values(ratingsData)
            .map((entry) => {
                if (typeof entry === 'number') return entry;
                if (entry && typeof entry === 'object') return entry.rating;
                return null;
            })
            .filter((rating) => Number.isFinite(rating) && rating >= 1 && rating <= 7);
    }

    // eslint-disable-next-line no-useless-assignment -- kept as in v1
    let averageWithoutUser = 4;
    if (currentRatings) {
        const ratingValues = extractValidRatings(currentRatings);
        const totalRatings = ratingValues.reduce((a, b) => a + b, 0) + seedScore * seedWeight;
        const totalCount = ratingValues.length + seedWeight;
        averageWithoutUser = totalRatings / totalCount;
    } else {
        averageWithoutUser = seedScore;
    }
    const difference = Math.abs(userPrediction - averageWithoutUser);
    const score = Math.max(0, 100 - Math.round(difference * 12));
    return { target: averageWithoutUser, score };
}

function mulberry32(seed) {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

describe('scoring constants', () => {
    it('keeps the v1 weight and penalty', () => {
        expect(SEED_WEIGHT).toBe(100);
        expect(SCORE_PENALTY).toBe(12);
    });
});

describe('validRatings', () => {
    it('accepts objects and legacy bare numbers on the 1-7 scale', () => {
        const node = {
            a: { rating: 3, prediction: 4 },
            b: 6,
            c: { rating: 0 },
            d: { rating: 8 },
            e: { rating: '5' },
            f: null,
            g: { prediction: 2 },
            h: { rating: 7 },
            i: Number.NaN,
        };
        expect(validRatings(node)).toEqual([3, 6, 7]);
    });

    it('can leave out the participant’s own rating', () => {
        const node = { session_1_a: { rating: 2 }, session_2_b: { rating: 6 } };
        expect(validRatings(node, 'session_1_a')).toEqual([6]);
    });

    it('returns an empty list for missing nodes', () => {
        expect(validRatings(null)).toEqual([]);
        expect(validRatings(undefined)).toEqual([]);
        expect(validRatings(5)).toEqual([]);
    });

    it('checks the scale', () => {
        expect(isValidRating(1)).toBe(true);
        expect(isValidRating(7)).toBe(true);
        expect(isValidRating(0.99)).toBe(false);
        expect(isValidRating('4')).toBe(false);
    });
});

describe('scoringTarget', () => {
    it('equals the expert rating when nobody else has rated', () => {
        expect(scoringTarget([], 6)).toEqual({ target: 6, n: 0 });
        expect(scoringTarget(null, 1)).toEqual({ target: 1, n: 0 });
    });

    it('counts the expert rating as 100 participants', () => {
        const { target, n } = scoringTarget([7, 7, 7, 7, 7, 7, 7, 7, 7, 7], 1);
        expect(n).toBe(10);
        expect(target).toBeCloseTo(170 / 110, 12);
    });

    it('accepts a raw ratings node', () => {
        expect(scoringTarget({ a: { rating: 5 }, b: 3 }, 1)).toEqual({ target: 108 / 102, n: 2 });
    });

    it('supports another weight', () => {
        expect(scoringTarget([7], 1, 1).target).toBe(4);
    });

    it('falls back to the scale midpoint without an expert rating, as v1 did', () => {
        expect(scoringTarget([], undefined).target).toBe(4);
    });
});

describe('predictionScore', () => {
    it('gives 100 for an exact prediction and loses 12 points per scale point', () => {
        expect(predictionScore(4, 4)).toBe(100);
        expect(predictionScore(5, 4)).toBe(88);
        expect(predictionScore(1, 7)).toBe(28);
    });

    it('rounds the penalty and never goes below zero', () => {
        expect(predictionScore(2, 170 / 110)).toBe(95);
        expect(predictionScore(1, 100)).toBe(0);
    });
});

describe('v1 parity', () => {
    it('reproduces the v1 target and score on random rating histories', () => {
        const random = mulberry32(42);
        const pick = () => 1 + Math.floor(random() * 7);
        for (let run = 0; run < 3000; run++) {
            const count = Math.floor(random() * 40);
            const node = {};
            for (let i = 0; i < count; i++) {
                // Mix current objects, legacy bare numbers and junk.
                const roll = random();
                node[`s${i}`] =
                    roll < 0.8 ? { rating: pick() } : roll < 0.9 ? pick() : { rating: 99 };
            }
            const expert = pick();
            const prediction = pick();
            const v1 = v1Score(count === 0 ? null : node, expert, prediction);
            const { target } = scoringTarget(node, expert);
            expect(target).toBeCloseTo(v1.target, 12);
            expect(predictionScore(prediction, target)).toBe(v1.score);
        }
    });

    it('excludes the participant’s own rating from their target', () => {
        const node = { mine: { rating: 7 }, other: { rating: 1 } };
        const own = scoringTarget(validRatings(node, 'mine'), 4);
        expect(own.n).toBe(1);
        expect(own.target).toBeCloseTo(401 / 101, 12);
    });
});

describe('meanAccuracy and displayedAccuracy', () => {
    it('divide summed points by rated studies', () => {
        expect(meanAccuracy(1044, 12)).toBe(87);
        expect(meanAccuracy(1129, 12)).toBeCloseTo(94.0833, 4);
        expect(displayedAccuracy(1129, 12)).toBe(94);
        expect(displayedAccuracy(1050, 12)).toBe(88);
    });

    it('return null when nothing has been rated', () => {
        expect(meanAccuracy(0, 0)).toBeNull();
        expect(displayedAccuracy(10, undefined)).toBeNull();
    });
});

describe('scoreBand', () => {
    it('maps scores to message bands', () => {
        expect(scoreBand(100)).toBe('perfect');
        expect(scoreBand(94)).toBe('outstanding');
        expect(scoreBand(93)).toBe('excellent');
        expect(scoreBand(88)).toBe('excellent');
        expect(scoreBand(82)).toBe('great');
        expect(scoreBand(70)).toBe('good');
        expect(scoreBand(69)).toBe('keepLearning');
        expect(scoreBand(0)).toBe('keepLearning');
    });
});
