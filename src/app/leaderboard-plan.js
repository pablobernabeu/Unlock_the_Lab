/**
 * Plans leaderboard writes that the database rules accept. A leaderboard
 * entry may be created with at most 1 study and 100 points, and each later
 * write may add at most 1 study and 100 points, never lowering either value,
 * with the score at most 100 per study. A participant whose entry fell behind
 * (a lost write, or a v1 session resumed without an entry) therefore has to
 * catch up one step at a time from the stored value.
 */

const POINTS_PER_STUDY = 100;
/** Enough steps for 48 studies plus the same again for score-only steps; a guard against loops. */
const MAX_STEPS = 200;

function asCount(value) {
    return Number.isInteger(value) && value >= 0 ? value : 0;
}

function asScore(value) {
    return Number.isFinite(value) && value >= 0 ? value : 0;
}

/**
 * The writes needed to bring the stored entry to the local values.
 * @param {{score?: number, papersRated?: number}|null} stored the current entry, null when none
 * @param {{score: number, papersRated: number}} local the participant's own totals
 * @returns {Array<{score: number, papersRated: number}>|null} the steps in order ([] when
 *   already up to date), or null when the rules cannot reach the local values (they never
 *   lower a value, so an entry ahead of the local totals stays as it is)
 */
export function planLeaderboardSteps(stored, local) {
    const target = { score: asScore(local?.score), papersRated: asCount(local?.papersRated) };
    if (target.score > target.papersRated * POINTS_PER_STUDY) return null;

    let current = stored ? { score: asScore(stored.score), papersRated: asCount(stored.papersRated) } : null;
    if (current && (target.score < current.score || target.papersRated < current.papersRated)) {
        return null;
    }

    const steps = [];
    while (!current || current.score !== target.score || current.papersRated !== target.papersRated) {
        if (steps.length >= MAX_STEPS) return null;
        const papersRated = Math.min(target.papersRated, current ? current.papersRated + 1 : 1);
        const score = Math.min(
            target.score,
            (current?.score ?? 0) + POINTS_PER_STUDY,
            papersRated * POINTS_PER_STUDY
        );
        if (current && score < current.score) return null;
        const next = { score, papersRated };
        if (current && next.score === current.score && next.papersRated === current.papersRated) {
            return null;
        }
        steps.push(next);
        current = next;
    }
    return steps;
}
