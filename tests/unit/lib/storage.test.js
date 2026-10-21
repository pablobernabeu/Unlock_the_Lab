import { afterEach, describe, expect, it, vi } from 'vitest';

function memoryStorage() {
    const data = new Map();
    return {
        getItem: (key) => (data.has(key) ? data.get(key) : null),
        setItem: (key, value) => data.set(key, String(value)),
        removeItem: (key) => data.delete(key),
        data,
    };
}

async function freshStorageModule() {
    vi.resetModules();
    return import('../../../src/lib/storage.js');
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('storage with working localStorage', () => {
    it('reads, writes and removes values', async () => {
        const area = memoryStorage();
        vi.stubGlobal('localStorage', area);
        const storage = await freshStorageModule();
        expect(storage.safeGet('missing', 'fallback')).toBe('fallback');
        expect(storage.safeSet('userName', 'Red Fox 07')).toBe(true);
        expect(area.data.get('userName')).toBe('Red Fox 07');
        expect(storage.safeGet('userName')).toBe('Red Fox 07');
        expect(storage.safeRemove('userName')).toBe(true);
        expect(storage.safeGet('userName')).toBeNull();
        expect(storage.storageAvailable()).toBe(true);
    });

    it('reads and writes JSON, tolerating corrupt values', async () => {
        const area = memoryStorage();
        vi.stubGlobal('localStorage', area);
        const storage = await freshStorageModule();
        expect(storage.safeSetJSON('workshopState', { currentPage: 3 })).toBe(true);
        expect(storage.safeGetJSON('workshopState')).toEqual({ currentPage: 3 });
        area.setItem('workshopState', '{broken');
        expect(storage.safeGetJSON('workshopState', { fresh: true })).toEqual({ fresh: true });
        const circular = {};
        circular.self = circular;
        expect(storage.safeSetJSON('x', circular)).toBe(false);
        expect(storage.safeSetJSON('x', undefined)).toBe(false);
        expect(area.data.has('x')).toBe(false);
    });

    it('does not throw for values that cannot become text', async () => {
        const area = memoryStorage();
        vi.stubGlobal('localStorage', area);
        const storage = await freshStorageModule();
        expect(() => storage.safeSet('x', Object.create(null))).not.toThrow();
        expect(storage.safeSet('x', Object.create(null))).toBe(false);
        expect(storage.safeGet('x')).toBeNull();
    });
});

describe('storage when the browser blocks it', () => {
    it('never throws and keeps values in memory for the page', async () => {
        const blocked = {
            getItem: () => {
                throw new DOMException('blocked', 'SecurityError');
            },
            setItem: () => {
                throw new DOMException('blocked', 'SecurityError');
            },
            removeItem: () => {
                throw new DOMException('blocked', 'SecurityError');
            },
        };
        vi.stubGlobal('localStorage', blocked);
        const storage = await freshStorageModule();
        expect(storage.safeGet('userName')).toBeNull();
        expect(storage.safeSet('userName', 'Red Fox 07')).toBe(false);
        expect(storage.safeGet('userName')).toBe('Red Fox 07');
        expect(storage.safeSetJSON('workshopState', { a: 1 })).toBe(false);
        expect(storage.safeGetJSON('workshopState')).toEqual({ a: 1 });
        expect(storage.safeRemove('userName')).toBe(false);
        expect(storage.safeGet('userName')).toBeNull();
        expect(storage.storageAvailable()).toBe(false);
    });

    it('copes with localStorage missing entirely or throwing on access', async () => {
        Object.defineProperty(globalThis, 'localStorage', {
            configurable: true,
            get() {
                throw new DOMException('denied', 'SecurityError');
            },
        });
        const storage = await freshStorageModule();
        expect(storage.safeSet('k', 'v')).toBe(false);
        expect(storage.safeGet('k')).toBe('v');
        expect(storage.storageAvailable()).toBe(false);
        delete globalThis.localStorage;
    });

    it('prefers a newer value that could not be persisted (quota exceeded)', async () => {
        const area = memoryStorage();
        vi.stubGlobal('localStorage', area);
        const storage = await freshStorageModule();
        storage.safeSet('workshopState', 'old');
        area.setItem = () => {
            throw new DOMException('full', 'QuotaExceededError');
        };
        expect(storage.safeSet('workshopState', 'new')).toBe(false);
        expect(storage.safeGet('workshopState')).toBe('new');
    });
});
