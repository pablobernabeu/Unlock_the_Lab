/**
 * Response time: ms from the first time a study was shown to the submission
 * of its answers. The first-display time is stored in the participant state,
 * so reloads, the back button and the pause overlay do not reset it (v1
 * restarted the clock whenever the page was shown again).
 */

/**
 * Records when a study was first shown, keeping an earlier record.
 * @param {Record<string, number>} timestamps studyId -> ms
 * @param {string} studyId
 * @param {number} now ms since the epoch
 * @returns {Record<string, number>} the same object when nothing changed, otherwise a copy
 */
export function markFirstDisplay(timestamps, studyId, now) {
    if (Number.isFinite(timestamps?.[studyId])) return timestamps;
    return { ...timestamps, [studyId]: now };
}

/**
 * The response time to store with a rating.
 * @param {Record<string, number>} timestamps studyId -> ms
 * @param {string} studyId
 * @param {number} now ms since the epoch
 * @returns {number|null} whole ms, or null when unknown (no record, or a clock that moved backwards)
 */
export function responseTimeFor(timestamps, studyId, now) {
    const shownAt = timestamps?.[studyId];
    if (!Number.isFinite(shownAt) || !Number.isFinite(now)) return null;
    const elapsed = Math.round(now - shownAt);
    return elapsed >= 0 ? elapsed : null;
}
