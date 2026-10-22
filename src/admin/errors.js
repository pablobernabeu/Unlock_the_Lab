/**
 * Error handling helpers for the admin panel: timeouts and the translation
 * key for each kind of failure. Pure, so they can be unit-tested in Node.
 */

/** Raised by withTimeout when the database does not answer in time. */
export class TimeoutError extends Error {
    constructor(ms) {
        super(`No answer from the database within ${ms} ms`);
        this.name = 'TimeoutError';
    }
}

/**
 * Rejects with a TimeoutError when `promise` has not settled within `ms`.
 * Firebase cannot cancel a request, so a write that times out may still be
 * applied later; callers must say so rather than report a failure.
 * @template T
 * @param {Promise<T>} promise
 * @param {number} ms
 * @returns {Promise<T>}
 */
export function withTimeout(promise, ms) {
    let timer;
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new TimeoutError(ms)), ms);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * True when the security rules refused a database request.
 * @param {unknown} error
 * @returns {boolean}
 */
export function isPermissionDenied(error) {
    return /permission[_ ]denied/i.test(`${error?.code ?? ''} ${error?.message ?? ''}`);
}

const SIGN_IN_ERRORS = Object.freeze({
    'auth/invalid-credential': 'admin.login.errors.invalidCredential',
    'auth/invalid-login-credentials': 'admin.login.errors.invalidCredential',
    'auth/wrong-password': 'admin.login.errors.invalidCredential',
    'auth/user-not-found': 'admin.login.errors.invalidCredential',
    'auth/invalid-email': 'admin.login.errors.invalidEmail',
    'auth/too-many-requests': 'admin.login.errors.tooManyRequests',
    'auth/user-disabled': 'admin.login.errors.userDisabled',
    'auth/network-request-failed': 'common.errors.offline',
});

/**
 * Translation key for a failed email and password sign-in.
 * @param {string | undefined} code Firebase Auth error code, e.g. 'auth/wrong-password'
 * @returns {string}
 */
export function signInErrorKey(code) {
    return SIGN_IN_ERRORS[code] ?? 'admin.login.errors.generic';
}

/**
 * Translation key for a failed database read or write.
 * @param {unknown} error
 * @returns {string}
 */
export function databaseErrorKey(error) {
    if (isPermissionDenied(error)) return 'admin.errors.permissionDenied';
    if (error instanceof TimeoutError) return 'common.errors.offline';
    return 'common.errors.generic';
}
