import { describe, expect, it } from 'vitest';
import { planLeaderboardSteps } from '../../../src/app/leaderboard-plan.js';

/**
 * The leaderboard write rules in database.rules.json, restated: creation with
 * at most 1 study and 100 points; updates never lower either value and raise
 * them by at most 1 study and 100 points; the score is at most 100 per study.
 */
function rulesAccept(previous, next) {
    if (!Number.isInteger(next.score) || !Number.isInteger(next.papersRated)) return false;
    if (next.score < 0 || next.score > next.papersRated * 100 || next.papersRated > 48)
        return false;
    if (!previous) return next.papersRated <= 1 && next.score <= 100;
    return (
        next.score >= previous.score &&
        next.score <= previous.score + 100 &&
        next.papersRated >= previous.papersRated &&
        next.papersRated <= previous.papersRated + 1
    );
}

function replay(stored, steps) {
    let current = stored;
    for (const step of steps) {
        expect(rulesAccept(current, step), JSON.stringify({ current, step })).toBe(true);
        current = step;
    }
    return current;
}

describe('planLeaderboardSteps', () => {
    it('creates an entry for the first rated study', () => {
        expect(planLeaderboardSteps(null, { score: 88, papersRated: 1 })).toEqual([
            { score: 88, papersRated: 1 },
        ]);
    });

    it('writes one step after each new rating', () => {
        expect(
            planLeaderboardSteps({ score: 352, papersRated: 4 }, { score: 452, papersRated: 5 })
        ).toEqual([{ score: 452, papersRated: 5 }]);
    });

    it('needs no write when the entry is up to date, or when nothing is rated yet', () => {
        expect(
            planLeaderboardSteps({ score: 352, papersRated: 4 }, { score: 352, papersRated: 4 })
        ).toEqual([]);
        expect(planLeaderboardSteps(null, { score: 0, papersRated: 0 })).toEqual([]);
    });

    it('catches up a resumed v1 session with no entry one study at a time', () => {
        const local = { score: 1044, papersRated: 12 };
        const steps = planLeaderboardSteps(null, local);
        expect(steps).toHaveLength(12);
        expect(replay(null, steps)).toEqual(local);
        expect(steps.map((step) => step.papersRated)).toEqual([
            1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
        ]);
    });

    it('keeps the average close to the final one while catching up (no brief 100%)', () => {
        const steps = planLeaderboardSteps(null, { score: 600, papersRated: 10 });
        for (const step of steps) expect(step.score / step.papersRated).toBeLessThanOrEqual(60);
    });

    it('catches up after a lost write, adding score-only steps when needed', () => {
        const stored = { score: 100, papersRated: 3 };
        const local = { score: 450, papersRated: 5 };
        const steps = planLeaderboardSteps(stored, local);
        expect(replay(stored, steps)).toEqual(local);
        expect(steps.at(-1)).toEqual(local);
    });

    it('steps a legacy entry with no papersRated', () => {
        const steps = planLeaderboardSteps({ score: 0 }, { score: 170, papersRated: 2 });
        expect(replay({ score: 0, papersRated: 0 }, steps)).toEqual({
            score: 170,
            papersRated: 2,
        });
    });

    it('gives up when the stored entry is ahead of this browser', () => {
        expect(
            planLeaderboardSteps({ score: 500, papersRated: 6 }, { score: 450, papersRated: 6 })
        ).toBeNull();
        expect(
            planLeaderboardSteps({ score: 400, papersRated: 6 }, { score: 450, papersRated: 5 })
        ).toBeNull();
    });

    it('refuses impossible local totals', () => {
        expect(planLeaderboardSteps(null, { score: 250, papersRated: 2 })).toBeNull();
    });

    it('handles the full 48 studies at 100 points each', () => {
        const local = { score: 4800, papersRated: 48 };
        expect(replay(null, planLeaderboardSteps(null, local))).toEqual(local);
    });

    it('produces only steps the rules accept for many random cases', () => {
        let seed = 7;
        const random = () => {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
        };
        for (let run = 0; run < 500; run++) {
            const papersRated = 1 + Math.floor(random() * 48);
            const score = Math.floor(random() * (papersRated * 100 + 1));
            const storedCount = Math.floor(random() * (papersRated + 1));
            const storedScore = Math.min(score, Math.floor(random() * (storedCount * 100 + 1)));
            const stored = random() < 0.3 ? null : { score: storedScore, papersRated: storedCount };
            const local = { score, papersRated };
            const steps = planLeaderboardSteps(stored, local);
            expect(steps, JSON.stringify({ stored, local })).not.toBeNull();
            const end = replay(stored, steps);
            if (steps.length) expect(end).toEqual(local);
        }
    });
});
