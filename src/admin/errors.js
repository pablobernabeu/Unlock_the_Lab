/**
 * Error handling helpers for the admin panel: the translation key for each
 * kind of failure. Pure, so they can be unit-tested in Node. The timeout and
 * refusal checks are shared with the participant app (src/lib/db-utils.js).
 */
import { TimeoutError, isPermissionDenied } from '../lib/db-utils.js';

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
