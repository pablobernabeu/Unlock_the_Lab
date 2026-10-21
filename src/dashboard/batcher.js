/**
 * Render batching. The live listeners can fire many times a second during a
 * workshop (every rating updates /ratings and /leaderboard), so changes are
 * collected for a short window and rendered together in one animation frame.
 */

/** How long changes are collected before a render. */
export const BATCH_WINDOW_MS = 300;

function nextFrame(callback) {
    if (typeof globalThis.requestAnimationFrame === 'function') {
        globalThis.requestAnimationFrame(callback);
    } else {
        setTimeout(callback, 0);
    }
}

/**
 * Creates a batcher. The first change starts the window; changes that arrive
 * during it join the same render, so a steady stream of updates still renders
 * at most once per window.
 * @param {(parts: Set<string>) => void} render receives the names of everything that changed
 * @param {object} [options]
 * @param {number} [options.delay] ms
 * @param {(callback: () => void, ms: number) => unknown} [options.wait] defaults to setTimeout
 * @param {(callback: () => void) => void} [options.frame] defaults to requestAnimationFrame
 * @returns {{mark: (...parts: string[]) => void, flush: () => void}}
 *   `mark` records changes; `flush` renders pending changes now
 */
export function createBatcher(
    render,
    {
        delay = BATCH_WINDOW_MS,
        wait = (callback, ms) => setTimeout(callback, ms),
        frame = nextFrame,
    } = {}
) {
    let pending = new Set();
    let scheduled = false;

    function flush() {
        scheduled = false;
        if (pending.size === 0) return;
        const parts = pending;
        pending = new Set();
        render(parts);
    }

    function mark(...parts) {
        for (const part of parts) pending.add(part);
        if (scheduled) return;
        scheduled = true;
        wait(() => frame(flush), delay);
    }

    return { mark, flush };
}
