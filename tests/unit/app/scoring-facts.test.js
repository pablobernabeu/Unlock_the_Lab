import { describe, expect, it } from 'vitest';
import { scoringFacts } from '../../../src/app/scoring-facts.js';
import { predictionScore, scoringTarget } from '../../../src/lib/scoring.js';

describe('scoringFacts', () => {
    const facts = scoringFacts();

    it('quotes the constants the app scores with', () => {
        expect(facts).toMatchObject({
            weight: 100,
            penalty: 12,
            minRank: 10,
            minFinish: 10,
            total: 48,
        });
    });

    it('gives the points for predictions 1 and 2 away from the target', () => {
        expect(facts.oneAway).toBe(88);
        expect(facts.twoAway).toBe(76);
        expect(facts.oneAway).toBe(predictionScore(3, 2));
    });

    it("states the expert's share of the target that scoringTarget really uses", () => {
        const others = Array(facts.exampleCount).fill(1);
        const { target } = scoringTarget(others, 7);
        // With every other rating at 1 and the expert at 7, the expert's share is (target − 1) / 6.
        expect(((target - 1) / 6) * 100).toBeCloseTo(facts.expertShare, 10);
        expect(Math.round(facts.expertShare)).toBe(83);
    });

    it('follows the number of studies and the example size', () => {
        expect(scoringFacts({ studyCount: 12, others: 100 })).toMatchObject({
            total: 12,
            exampleCount: 100,
            expertShare: 50,
        });
    });
});
