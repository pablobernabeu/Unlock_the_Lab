import { describe, expect, it } from 'vitest';
import { mean, meanCI, sd, shareCI, tCritical95 } from '../../../src/lib/stats.js';

describe('tCritical95', () => {
    // Reference two-sided 95% quantiles, qt(0.975, df) in R.
    const reference = {
        1: 12.7062,
        2: 4.3027,
        3: 3.1824,
        5: 2.5706,
        10: 2.2281,
        30: 2.0423,
        100: 1.984,
        1000: 1.9623,
    };

    for (const [df, expected] of Object.entries(reference)) {
        it(`matches qt(0.975, ${df}) = ${expected}`, () => {
            expect(Math.abs(tCritical95(Number(df)) - expected)).toBeLessThan(1e-3);
        });
    }

    it('approaches the normal quantile for very large df', () => {
        expect(tCritical95(200000)).toBeCloseTo(1.959964, 6);
        expect(Math.abs(tCritical95(100000) - 1.959987)).toBeLessThan(1e-4);
    });

    it('decreases as df grows', () => {
        for (let df = 1; df < 60; df++) {
            expect(tCritical95(df + 1)).toBeLessThan(tCritical95(df));
        }
    });

    it('returns NaN for invalid df', () => {
        expect(tCritical95(0)).toBeNaN();
        expect(tCritical95(-3)).toBeNaN();
        expect(tCritical95(1.5)).toBeNaN();
        expect(tCritical95(Number.NaN)).toBeNaN();
    });
});

describe('mean and sd', () => {
    it('compute the mean and the sample SD', () => {
        expect(mean([1, 2, 3, 4])).toBe(2.5);
        expect(sd([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.13809, 5);
    });

    it('ignore non-finite values', () => {
        expect(mean([1, Number.NaN, 3, null, undefined, Infinity])).toBe(2);
    });

    it('return null when there is not enough data', () => {
        expect(mean([])).toBeNull();
        expect(mean(undefined)).toBeNull();
        expect(sd([5])).toBeNull();
    });
});

describe('meanCI', () => {
    it('gives a t interval for the mean', () => {
        const result = meanCI([1, 1, 4, 1, 1]);
        expect(result.n).toBe(5);
        expect(result.mean).toBeCloseTo(1.6, 10);
        expect(result.sd).toBeCloseTo(1.341641, 6);
        expect(result.se).toBeCloseTo(0.6, 6);
        // R: t.test(c(1, 1, 4, 1, 1))$conf.int -> -0.06587, 3.26587
        expect(result.lower).toBeCloseTo(-0.06587, 4);
        expect(result.upper).toBeCloseTo(3.26587, 4);
    });

    it('returns null spread and bounds below two values', () => {
        expect(meanCI([4])).toEqual({
            n: 1,
            mean: 4,
            sd: null,
            se: null,
            lower: null,
            upper: null,
        });
        expect(meanCI([])).toEqual({
            n: 0,
            mean: null,
            sd: null,
            se: null,
            lower: null,
            upper: null,
        });
    });
});

describe('shareCI', () => {
    const allocation = (title, access, source, theory, methods, conclusion) => ({
        title,
        access,
        source,
        theory,
        methods,
        conclusion,
    });

    it('averages token shares per criterion over valid allocations', () => {
        const result = shareCI([allocation(10, 2, 2, 2, 2, 2), allocation(0, 4, 4, 4, 4, 4)]);
        expect(result.n).toBe(2);
        const title = result.criteria.find(({ key }) => key === 'title');
        expect(title.mean).toBeCloseTo(0.25, 10);
        expect(title.lower).toBe(0);
        expect(title.upper).toBeLessThanOrEqual(1);
        expect(result.criteria.map(({ key }) => key)).toEqual([
            'title',
            'access',
            'source',
            'theory',
            'methods',
            'conclusion',
        ]);
    });

    it('ignores crafted or incomplete allocations', () => {
        const result = shareCI({
            honest: allocation(5, 3, 3, 3, 3, 3),
            crafted: allocation(400, -380, 0, 0, 0, 0),
            fractional: allocation(10.5, 9.5, 0, 0, 0, 0),
            incomplete: allocation(5, 5, 0, 0, 0, 0),
            notAnObject: 7,
        });
        expect(result.n).toBe(1);
        expect(result.criteria[0].mean).toBeCloseTo(0.25, 10);
        expect(result.criteria[0].lower).toBeNull();
    });

    it('keeps every share and bound within 0-1', () => {
        const allocations = Array.from({ length: 12 }, (_, index) =>
            allocation(20 - (index % 3), index % 3, 0, 0, 0, 0)
        );
        for (const criterion of shareCI(allocations).criteria) {
            expect(criterion.mean).toBeGreaterThanOrEqual(0);
            expect(criterion.lower).toBeGreaterThanOrEqual(0);
            expect(criterion.upper).toBeLessThanOrEqual(1);
        }
    });

    it('handles no data', () => {
        expect(shareCI(null).n).toBe(0);
        expect(shareCI([]).criteria[0].mean).toBeNull();
    });
});
