/**
 * Small helpers for working with Realtime Database promises, shared by the
 * participant app and the facilitator panel. No Firebase imports, so they can
 * be unit-tested in Node.
 */

/** How long a page waits for a database read or write before telling the person using it. */
export const DB_TIMEOUT_MS = 15000;

/** Error raised by withTimeout. */
export class TimeoutError extends Error {
    constructor(label, ms) {
        super(`${label} timed out after ${ms} ms`);
        this.name = 'TimeoutError';
    }
}

/**
 * Rejects with a TimeoutError when `promise` has not settled within `ms`.
 * The underlying operation is not cancelled (Firebase cannot cancel a write;
 * a queued write is still sent when the connection returns).
 * @template T
 * @param {Promise<T>} promise
 * @param {number} ms
 * @param {string} [label]
 * @returns {Promise<T>}
 */
export function withTimeout(promise, ms, label = 'Operation') {
    let timer;
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new TimeoutError(label, ms)), ms);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * True for a database error caused by the security rules refusing a request.
 * @param {unknown} error
 * @returns {boolean}
 */
export function isPermissionDenied(error) {
    const text = `${error?.code ?? ''} ${error?.message ?? ''}`;
    return /permission[_ ]denied/i.test(text);
}

/**
 * Runs `attempt` until it succeeds, waiting `delays[i]` ms before retry i + 1.
 * @template T
 * @param {() => Promise<T>} attempt
 * @param {number[]} delays e.g. [1000, 3000] for three attempts in all
 * @param {object} [options]
 * @param {(error: unknown) => boolean} [options.shouldRetry] stop early for errors that will not go away
 * @param {(ms: number) => Promise<void>} [options.wait]
 * @returns {Promise<T>} the first success, or the last error
 */
export async function retry(attempt, delays, { shouldRetry = () => true, wait = sleep } = {}) {
    for (let index = 0; ; index++) {
        try {
            return await attempt();
        } catch (error) {
            if (index >= delays.length || !shouldRetry(error)) throw error;
            await wait(delays[index]);
        }
    }
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
