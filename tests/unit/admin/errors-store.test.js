import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    TimeoutError,
    databaseErrorKey,
    isPermissionDenied,
    signInErrorKey,
    withTimeout,
} from '../../../src/admin/errors.js';
import { createStore } from '../../../src/admin/store.js';
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
    it('recognises refusals by the rules', () => {
        expect(isPermissionDenied({ code: 'PERMISSION_DENIED' })).toBe(true);
        expect(isPermissionDenied(new Error('permission_denied at /ratings'))).toBe(true);
        expect(isPermissionDenied(new Error('Client is offline'))).toBe(false);
        expect(isPermissionDenied(null)).toBe(false);
    });

    it('maps failures to messages that exist', () => {
        const errors = [{ code: 'PERMISSION_DENIED' }, new TimeoutError(10), new Error('x')];
        for (const error of errors) expect(hasMessage(databaseErrorKey(error))).toBe(true);
        expect(databaseErrorKey(new TimeoutError(10))).toBe('common.errors.offline');
    });
});

describe('withTimeout', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('passes on a result that arrives in time', async () => {
        await expect(withTimeout(Promise.resolve(3), 100)).resolves.toBe(3);
    });

    it('rejects with a TimeoutError when the answer is late', async () => {
        vi.useFakeTimers();
        const late = withTimeout(new Promise(() => {}), 1000);
        vi.advanceTimersByTime(1000);
        await expect(late).rejects.toBeInstanceOf(TimeoutError);
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
