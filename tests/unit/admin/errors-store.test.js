import { afterEach, describe, expect, it, vi } from 'vitest';
import * as adminErrors from '../../../src/admin/errors.js';
import { databaseErrorKey, signInErrorKey } from '../../../src/admin/errors.js';
import { createStore } from '../../../src/admin/store.js';
import { TimeoutError, withTimeout } from '../../../src/lib/db-utils.js';
import { lookupMessage } from '../../../src/lib/i18n-core.js';
import { loadLocale } from '../lib/i18n-keys.js';

const english = loadLocale('en');

function hasMessage(key) {
    const value = lookupMessage(english, key);
    return typeof value === 'string' && value !== '';
}

describe('signInErrorKey', () => {
    it('maps Firebase Auth codes to messages that exist', () => {
        const codes = [
            'auth/invalid-credential',
            'auth/invalid-login-credentials',
            'auth/wrong-password',
            'auth/user-not-found',
            'auth/invalid-email',
            'auth/too-many-requests',
            'auth/user-disabled',
            'auth/network-request-failed',
            'auth/something-new',
            undefined,
        ];
        for (const code of codes) expect(hasMessage(signInErrorKey(code)), code).toBe(true);
    });

    it('does not reveal whether the email or the password was wrong', () => {
        expect(signInErrorKey('auth/user-not-found')).toBe(signInErrorKey('auth/wrong-password'));
    });
});

describe('database errors', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('maps failures to messages that exist', () => {
        const errors = [
            { code: 'PERMISSION_DENIED' },
            new Error('permission_denied at /ratings'),
            new TimeoutError('Reading', 10),
            new Error('x'),
        ];
        for (const error of errors) expect(hasMessage(databaseErrorKey(error))).toBe(true);
        expect(databaseErrorKey({ code: 'PERMISSION_DENIED' })).toBe(
            'admin.errors.permissionDenied'
        );
        expect(databaseErrorKey(new Error('Client is offline'))).toBe('common.errors.generic');
    });

    it('reports a request that timed out in the shared helper as a connection problem', async () => {
        vi.useFakeTimers();
        const late = withTimeout(new Promise(() => {}), 1000).catch((error) => error);
        await vi.advanceTimersByTimeAsync(1000);
        expect(databaseErrorKey(await late)).toBe('common.errors.offline');
    });

    it('keeps no copies of the shared database helpers', () => {
        // They live in src/lib/db-utils.js, tested in tests/unit/lib/db-utils.test.js.
        expect(Object.keys(adminErrors).sort()).toEqual(['databaseErrorKey', 'signInErrorKey']);
    });
});

describe('createStore', () => {
    function manualSchedule() {
        const queue = [];
        return {
            schedule: (callback) => queue.push(callback),
            run: () => queue.splice(0).forEach((f) => f()),
        };
    }

    it('notifies listeners once per frame however many nodes changed', () => {
        const frames = manualSchedule();
        const store = createStore({ schedule: frames.schedule });
        const listener = vi.fn();
        store.subscribe(listener);
        store.set('ratings', { a: 1 });
        store.set('active', null);
        expect(listener).not.toHaveBeenCalled();
        frames.run();
        expect(listener).toHaveBeenCalledTimes(1);
        expect(store.get('ratings')).toEqual({ a: 1 });
    });

    it('knows which nodes have loaded, including empty ones', () => {
        const store = createStore({ schedule: () => {} });
        store.set('active', null);
        expect(store.has('active')).toBe(true);
        expect(store.has('active', 'ratings')).toBe(false);
        expect(store.values()).toEqual({ active: null });
    });

    it('forgets everything on clear and stops notifying after unsubscribe', () => {
        const frames = manualSchedule();
        const store = createStore({ schedule: frames.schedule });
        const listener = vi.fn();
        const unsubscribe = store.subscribe(listener);
        store.set('ratings', {});
        store.clear();
        frames.run();
        expect(listener).toHaveBeenCalledTimes(1);
        expect(store.has('ratings')).toBe(false);
        unsubscribe();
        store.set('ratings', {});
        frames.run();
        expect(listener).toHaveBeenCalledTimes(1);
    });
});
