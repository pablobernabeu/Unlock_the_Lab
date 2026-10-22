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

function sameTotals(a, b) {
    return a.score === b.score && a.papersRated === b.papersRated;
}

/**
 * The next step from `current` towards `target`. The score follows the
 * target's average while the study count rises, so the entry never looks
 * better than the participant really is while it catches up.
 */
function nextStep(current, target) {
    const papersRated = Math.min(target.papersRated, current.papersRated + 1);
    const proportional = Math.floor((target.score * papersRated) / target.papersRated);
    const score = Math.min(
        target.score,
        Math.max(current.score, proportional),
        current.score + POINTS_PER_STUDY,
        papersRated * POINTS_PER_STUDY
    );
    return { score, papersRated };
}

/**
 * The writes needed to bring the stored entry to the local values.
 * @param {{score?: number, papersRated?: number}|null} stored the current entry, null when none
 * @param {{score: number, papersRated: number}} local the participant's own totals
 * @returns {Array<{score: number, papersRated: number}>|null} the steps in order ([] when
 *   already up to date or when there is nothing to create), or null when the rules cannot
 *   reach the local values (they never lower a value, so an entry ahead of the local
 *   totals stays as it is)
 */
export function planLeaderboardSteps(stored, local) {
    const target = { score: asScore(local?.score), papersRated: asCount(local?.papersRated) };
    if (target.score > target.papersRated * POINTS_PER_STUDY) return null;
    if (!stored && target.papersRated === 0) return [];

    let current = stored
        ? { score: asScore(stored.score), papersRated: asCount(stored.papersRated) }
        : { score: 0, papersRated: 0 };
    if (target.score < current.score || target.papersRated < current.papersRated) return null;

    const steps = [];
    // A missing entry must be created even when the first step equals the empty start.
    let mustWrite = !stored;
    while (mustWrite || !sameTotals(current, target)) {
        if (steps.length >= MAX_STEPS) return null;
        const next = nextStep(current, target);
        if (!mustWrite && sameTotals(next, current)) return null;
        steps.push(next);
        current = next;
        mustWrite = false;
    }
    return steps;
}
