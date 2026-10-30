import { describe, expect, it } from 'vitest';
import { CONTENT_VERSION, SCORE_PENALTY, SEED_WEIGHT } from '../../../src/lib/config.js';
import {
    displayedAccuracy,
    isValidRating,
    meanAccuracy,
    predictionScore,
    ratingOf,
    scoreBand,
    scoringTarget,
    targetRatings,
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

    it('can keep one content version, counting records without one as version 1', () => {
        const node = {
            a: { rating: 2, contentVersion: 3 },
            b: { rating: 3, contentVersion: 2 },
            c: { rating: 4 },
            d: 5,
            e: { rating: 6, contentVersion: 3 },
        };
        expect(validRatings(node, undefined, 3)).toEqual([2, 6]);
        expect(validRatings(node, 'e', 3)).toEqual([2]);
        expect(validRatings(node, undefined, 2)).toEqual([3]);
        expect(validRatings(node, undefined, 1)).toEqual([4, 5]);
        expect(validRatings(node, undefined, null)).toEqual([2, 3, 4, 5, 6]);
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

describe('targetRatings', () => {
    const current = CONTENT_VERSION;

    it('keeps only ratings of the current content version', () => {
        const node = {
            mine: { rating: 7, contentVersion: current },
            other: { rating: 3, contentVersion: current },
            earlier: { rating: 1, contentVersion: current - 1 },
            v1: { rating: 2 },
            bare: 6,
            off: { rating: 9, contentVersion: current },
        };
        expect(targetRatings(node)).toEqual([7, 3]);
        expect(targetRatings(node, 'mine')).toEqual([3]);
    });

    it('treats records without a content version as version 1', () => {
        const node = { a: { rating: 4 }, b: 5 };
        expect(targetRatings(node)).toEqual(current === 1 ? [4, 5] : []);
        expect(validRatings(node, undefined, 1)).toEqual([4, 5]);
    });

    it('returns an empty list for missing nodes', () => {
        expect(targetRatings(null)).toEqual([]);
        expect(targetRatings(undefined, 'mine')).toEqual([]);
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

    it('accepts a raw ratings node and counts its current-version ratings only', () => {
        const node = {
            a: { rating: 5, contentVersion: CONTENT_VERSION },
            b: { rating: 3, contentVersion: CONTENT_VERSION },
            c: { rating: 7, contentVersion: CONTENT_VERSION - 1 },
            d: 7,
        };
        expect(scoringTarget(node, 1)).toEqual({ target: 108 / 102, n: 2 });
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
            // v1 pooled every rating; the version filter is tested above.
            const { target } = scoringTarget(validRatings(node), expert);
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

describe('ratingOf', () => {
    it('reads the rating of v2 and v1 records and of very old bare numbers', () => {
        expect(ratingOf({ rating: 5, prediction: 4 })).toBe(5);
        expect(ratingOf(3)).toBe(3);
        expect(ratingOf({ rating: 7, room: 'DEMO-1' })).toBe(7);
    });

    it('is null for a missing rating or one off the 1-7 scale', () => {
        for (const record of [null, undefined, {}, { rating: 0 }, { rating: 8 }, 9, '5', NaN]) {
            expect(ratingOf(record)).toBeNull();
        }
        expect(ratingOf({ rating: '5' })).toBeNull();
    });
});
