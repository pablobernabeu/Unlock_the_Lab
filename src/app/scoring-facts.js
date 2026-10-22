/**
 * The numbers quoted in the welcome page's explanation of scoring and the
 * leaderboard. They are computed from the same constants and functions the
 * app scores with, so the explanation cannot drift from the code.
 */
import {
    MIN_STUDIES_TO_FINISH,
    MIN_STUDIES_TO_RANK,
    SCORE_PENALTY,
    SEED_WEIGHT,
    STUDY_COUNT,
} from '../lib/config.js';
import { predictionScore } from '../lib/scoring.js';

/** The illustrative number of other participants' ratings in the explanation. */
export const EXAMPLE_OTHER_RATINGS = 20;

/**
 * @param {object} [options]
 * @param {number} [options.studyCount] studies in the workshop
 * @param {number} [options.others] other participants' ratings in the example
 * @returns {{weight: number, penalty: number, exampleCount: number, expertShare: number,
 *   oneAway: number, twoAway: number, minRank: number, minFinish: number, total: number}}
 *   `expertShare` is a percentage (0-100)
 */
export function scoringFacts({ studyCount = STUDY_COUNT, others = EXAMPLE_OTHER_RATINGS } = {}) {
    return {
        weight: SEED_WEIGHT,
        penalty: SCORE_PENALTY,
        exampleCount: others,
        expertShare: (SEED_WEIGHT / (SEED_WEIGHT + others)) * 100,
        oneAway: predictionScore(5, 4),
        twoAway: predictionScore(6, 4),
        minRank: MIN_STUDIES_TO_RANK,
        minFinish: MIN_STUDIES_TO_FINISH,
        total: studyCount,
    };
}
