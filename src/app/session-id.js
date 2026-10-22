/**
 * Session ids in the v1 format, 'session_<Date.now()>_<random base-36>', which
 * the database rules check with SESSION_ID_PATTERN. v1 used Math.random and
 * the deprecated substr; this uses crypto random bytes.
 */
import { SESSION_ID_PATTERN } from '../lib/patterns.js';

const SUFFIX_LENGTH = 9;
const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';

function cryptoBytes(count) {
    const bytes = new Uint8Array(count);
    globalThis.crypto.getRandomValues(bytes);
    return bytes;
}

/**
 * A new session id.
 * @param {object} [options]
 * @param {number} [options.now] ms since the epoch
 * @param {(count: number) => Uint8Array} [options.randomBytes]
 * @returns {string} e.g. 'session_1771630835301_gj69lmk1o'
 */
export function generateSessionId({ now = Date.now(), randomBytes = cryptoBytes } = {}) {
    // 252 is the largest multiple of 36 below 256: rejecting bytes above it keeps every character equally likely.
    let suffix = '';
    while (suffix.length < SUFFIX_LENGTH) {
        for (const byte of randomBytes(SUFFIX_LENGTH)) {
            if (byte < 252 && suffix.length < SUFFIX_LENGTH) suffix += ALPHABET[byte % 36];
        }
    }
    const id = `session_${Math.floor(now)}_${suffix}`;
    if (!SESSION_ID_PATTERN.test(id)) throw new Error(`Generated an invalid session id: ${id}`);
    return id;
}
