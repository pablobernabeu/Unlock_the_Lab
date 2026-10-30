/**
 * Inactivity timing: a warning shortly before the session pauses, then the
 * pause itself. Any interaction restarts the countdown (at most once every
 * few seconds, so pointer movement does not reset timers constantly) until
 * the warning appears; from then on only `reset()` (the warning's Continue
 * button) restarts it, so the warning's 'pauses in 5 minutes' stays true and
 * a second warning never opens on top of the first.
 * There is no hard cap on session length.
 */

const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'scroll', 'touchstart'];
const RESET_DEBOUNCE_MS = 5000;

/**
 * @param {object} options
 * @param {number} options.timeoutMs inactivity before `onTimeout`
 * @param {number} options.warningMs how long before the timeout `onWarning` runs
 * @param {() => void} options.onWarning
 * @param {() => void} options.onTimeout
 * @param {EventTarget} [options.target] where activity is observed
 * @param {() => number} [options.now]
 */
export function createInactivityMonitor({
    timeoutMs,
    warningMs,
    onWarning,
    onTimeout,
    target = globalThis.document,
    now = () => Date.now(),
}) {
    let warningTimer = null;
    let timeoutTimer = null;
    let lastReset = 0;
    let running = false;
    let warned = false;

    function clearTimers() {
        clearTimeout(warningTimer);
        clearTimeout(timeoutTimer);
        warningTimer = null;
        timeoutTimer = null;
    }

    function schedule() {
        clearTimers();
        warned = false;
        lastReset = now();
        warningTimer = setTimeout(() => {
            warned = true;
            onWarning();
        }, timeoutMs - warningMs);
        timeoutTimer = setTimeout(() => {
            running = false;
            stopListening();
            clearTimers();
            onTimeout();
        }, timeoutMs);
    }

    function onActivity() {
        if (running && !warned && now() - lastReset >= RESET_DEBOUNCE_MS) schedule();
    }

    function stopListening() {
        for (const type of ACTIVITY_EVENTS) target?.removeEventListener(type, onActivity, true);
    }

    return {
        /** Starts (or restarts) the countdown. */
        start() {
            if (!running) {
                for (const type of ACTIVITY_EVENTS) {
                    target?.addEventListener(type, onActivity, { capture: true, passive: true });
                }
            }
            running = true;
            schedule();
        },
        /** Restarts the countdown now (for 'Continue' in the warning). */
        reset() {
            if (running) schedule();
        },
        /** Stops timers and listeners. */
        stop() {
            running = false;
            stopListening();
            clearTimers();
        },
    };
}
