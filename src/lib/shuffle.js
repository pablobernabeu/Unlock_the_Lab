/**
 * Seeded Fisher-Yates shuffle that reproduces v1's `shufflePapers` exactly, so
 * participants who resume a v1 session see their studies in the same order.
 * Do not change the hash, the generator constants or the loop: stored states
 * index studies by position in this order.
 */

const MODULUS = 233280;
const MULTIPLIER = 9301;
const INCREMENT = 49297;

/**
 * 32-bit string hash used as the seed (the classic `hash * 31 + charCode`).
 * @param {string} text
 * @returns {number} a signed 32-bit integer
 */
function hashString(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        hash = (hash << 5) - hash + text.charCodeAt(i);
        hash = hash & hash;
    }
    return hash;
}

/**
 * Linear congruential generator returning values in [0, 1).
 * `Math.abs(...) % MODULUS` is v1's fix for negative hashes, which had produced
 * negative indices; non-negative seeds kept their original sequence.
 * @param {number} hash
 * @returns {() => number}
 */
function createSeededRandom(hash) {
    let seed = Math.abs(hash) % MODULUS;
    return () => {
        seed = (seed * MULTIPLIER + INCREMENT) % MODULUS;
        return seed / MODULUS;
    };
}

/**
 * Returns a new array with `items` in the participant's study order.
 * The input is not modified. Without a session id the order is unchanged, as in v1.
 * @template T
 * @param {T[]} items items in canonical order (STUDY-1 to STUDY-48)
 * @param {string} sessionId e.g. 'session_1771630835301_gj69lmk1o'
 * @returns {T[]}
 */
export function seededShuffle(items, sessionId) {
    const result = Array.from(items ?? []);
    if (!result.length || !sessionId) return result;

    const random = createSeededRandom(hashString(String(sessionId)));
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}
