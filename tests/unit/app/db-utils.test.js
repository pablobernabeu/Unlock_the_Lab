import { afterEach, describe, expect, it, vi } from 'vitest';
import { TimeoutError, isPermissionDenied, retry, withTimeout } from '../../../src/app/db-utils.js';

afterEach(() => {
    vi.useRealTimers();
});

describe('withTimeout', () => {
    it('passes through a result that arrives in time', async () => {
        await expect(withTimeout(Promise.resolve(4), 100)).resolves.toBe(4);
    });

    it('rejects with a TimeoutError when the operation takes too long', async () => {
        vi.useFakeTimers();
        const pending = withTimeout(new Promise(() => {}), 500, 'Saving');
        const assertion = expect(pending).rejects.toBeInstanceOf(TimeoutError);
        await vi.advanceTimersByTimeAsync(500);
        await assertion;
    });
});

describe('isPermissionDenied', () => {
    it('recognises the database refusal in its several spellings', () => {
        expect(isPermissionDenied({ code: 'PERMISSION_DENIED' })).toBe(true);
        expect(isPermissionDenied(new Error('PERMISSION_DENIED: Permission denied'))).toBe(true);
        expect(isPermissionDenied(new Error('permission denied'))).toBe(true);
        expect(isPermissionDenied(new Error('Client is offline'))).toBe(false);
        expect(isPermissionDenied(null)).toBe(false);
    });
});

describe('retry', () => {
    it('retries after each delay until the attempt succeeds', async () => {
        const waits = [];
        const attempt = vi
            .fn()
            .mockRejectedValueOnce(new Error('a'))
            .mockRejectedValueOnce(new Error('b'))
            .mockResolvedValue('ok');
        const result = await retry(attempt, [10, 20], {
            wait: async (ms) => waits.push(ms),
        });
        expect(result).toBe('ok');
        expect(waits).toEqual([10, 20]);
        expect(attempt).toHaveBeenCalledTimes(3);
    });

    it('gives up with the last error', async () => {
        const attempt = vi.fn().mockRejectedValue(new Error('down'));
        await expect(retry(attempt, [1], { wait: async () => {} })).rejects.toThrow('down');
        expect(attempt).toHaveBeenCalledTimes(2);
    });

    it('stops early for errors that will not go away', async () => {
        const attempt = vi.fn().mockRejectedValue(new Error('fatal'));
        await expect(
            retry(attempt, [1, 1], { shouldRetry: () => false, wait: async () => {} })
        ).rejects.toThrow('fatal');
        expect(attempt).toHaveBeenCalledTimes(1);
    });
});
