/**
 * Application-wide constants. Every tunable number lives here so the
 * participant app, dashboard, admin panel and tests agree on one value.
 */

/** Weight of the expert rating in the scoring target, counted as this many participants. */
export const SEED_WEIGHT = 100;

/** Points lost per scale point of prediction error (score = 100 − round(12 × error)). */
export const SCORE_PENALTY = 12;

/** Studies a participant must rate before they can finish early. */
export const MIN_STUDIES_TO_FINISH = 10;

/** Studies an entry needs before it is ranked on a leaderboard. */
export const MIN_STUDIES_TO_RANK = 10;

/** Number of rated studies that triggers the milestone message. */
export const MILESTONE_STUDIES = 12;

/** Tokens each participant distributes across the six criteria. */
export const TOKEN_BUDGET = 20;

/** Inactivity after which a participant's session is paused. */
export const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;

/** How long before the pause the inactivity warning appears. */
export const INACTIVITY_WARNING_MS = 5 * 60 * 1000;

/** Interval between presence heartbeats (`/active/{sessionId}/lastActive`). */
export const PRESENCE_HEARTBEAT_MS = 60 * 1000;

/** A presence entry counts as 'active now' if its heartbeat is newer than this. */
export const ACTIVE_WINDOW_MS = 2 * 60 * 1000;

/**
 * Content version (study texts and feedback, expert ratings, rubric, rating guide and
 * glossary; see docs/data.md), stamped on every new rating.
 */
export const CONTENT_VERSION = 3;

/** When expert feedback is shown: after each study ('each') or only at the end ('end'). */
export const FEEDBACK_MODE = 'each';

/** Package version, injected at build time by Vite's `define` (a fallback keeps Node usable). */
export const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0-dev';

/** Maximum number of leaderboard rows shown on the dashboard. */
export const LEADERBOARD_SIZE = 200;

/** Leaderboard rows shown on the participant's results page. */
export const RESULTS_TOP_N = 5;

/** Number of studies in the workshop. */
export const STUDY_COUNT = 48;

/** The rating scale used for both quality ratings and predictions. */
export const RATING_MIN = 1;
export const RATING_MAX = 7;

/**
 * localStorage keys. `state` and `userName` are the v1 keys and must not change,
 * otherwise participants with a session in progress lose it.
 */
export const STORAGE_KEYS = Object.freeze({
    state: 'workshopState',
    userName: 'userName',
    motion: 'utl.motion',
    locale: 'utl.locale',
});
