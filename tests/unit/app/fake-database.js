/**
 * An in-memory stand-in for 'firebase/database' and the participant's
 * anonymous sign-in, for unit tests of the app's database code. Test files
 * install it with:
 *
 *   vi.mock('firebase/database', () => import('./fake-database.js').then((m) => m.databaseModule));
 *   vi.mock('firebase/auth', () => import('./fake-database.js').then((m) => m.authModule));
 *   vi.mock('../../../src/lib/firebase.js', () =>
 *       import('./fake-database.js').then((m) => m.firebaseModule));
 *
 * `fake.hold(op, path)` keeps the next matching write pending (its data are
 * applied at once, as the server would, but the promise waits) so tests can
 * act while an acknowledgement is outstanding; `fake.refuse(op, path)` makes
 * it fail as the rules would.
 */
import { vi } from 'vitest';

const SERVER_TIMESTAMP = Object.freeze({ '.sv': 'timestamp' });

function segments(path) {
    return String(path ?? '')
        .split('/')
        .filter(Boolean);
}

/** A copy of `value` with server timestamps replaced by `now`. */
function resolveTimestamps(value, now) {
    if (value === SERVER_TIMESTAMP) return now;
    if (value && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value).map(([key, child]) => [key, resolveTimestamps(child, now)])
        );
    }
    return value;
}

function snapshot(value) {
    const present = value !== null && value !== undefined;
    return {
        exists: () => present,
        val: () => (present ? structuredClone(value) : null),
        child: (key) => snapshot(present ? value[key] : null),
    };
}

function permissionDenied(path) {
    const error = new Error(`PERMISSION_DENIED: Permission denied at ${path}`);
    error.code = 'PERMISSION_DENIED';
    return error;
}

function createFake() {
    const fake = {
        data: {},
        now: 1_800_000_000_000,
        uid: 'uid-1',
        /** Every write, in order: {op, path, value}. */
        writes: [],
        listeners: new Set(),
        rules: [],
    };

    fake.read = (path) => {
        let node = fake.data;
        for (const key of segments(path)) {
            if (node === null || typeof node !== 'object') return null;
            node = node[key];
        }
        return node ?? null;
    };

    fake.write = (path, value) => {
        const keys = segments(path);
        let node = fake.data;
        for (const key of keys.slice(0, -1)) {
            if (node[key] === null || typeof node[key] !== 'object') node[key] = {};
            node = node[key];
        }
        const last = keys.at(-1);
        if (value === null || value === undefined) delete node[last];
        else node[last] = resolveTimestamps(value, fake.now);
        for (const listener of fake.listeners) {
            if (listener.path === path) listener.callback(snapshot(fake.read(path)));
        }
    };

    fake.reset = () => {
        fake.data = {};
        fake.writes = [];
        fake.listeners.clear();
        fake.rules = [];
        fake.uid = 'uid-1';
    };

    /** The next `op` ('set', 'update' or 'remove') at `path` lands, but its promise waits. */
    fake.hold = (op, path) => {
        let release;
        const released = new Promise((resolve) => {
            release = resolve;
        });
        fake.rules.push({ op, path, kind: 'hold', released });
        return () => release();
    };

    /** The next `op` at `path` is refused, as the rules would refuse it. */
    fake.refuse = (op, path) => {
        fake.rules.push({ op, path, kind: 'refuse' });
    };

    fake.writesTo = (op, path) =>
        fake.writes.filter((write) => write.op === op && write.path === path);

    fake.apply = (op, path, value, change) => {
        fake.writes.push({ op, path, value });
        const index = fake.rules.findIndex((rule) => rule.op === op && rule.path === path);
        const rule = index >= 0 ? fake.rules.splice(index, 1)[0] : null;
        if (rule?.kind === 'refuse') return Promise.reject(permissionDenied(path));
        change();
        return rule?.kind === 'hold' ? rule.released : Promise.resolve();
    };

    return fake;
}

/** The shared fake; call `fake.reset()` before each test. */
export const fake = createFake();

const INFO = {
    '.info/connected': () => true,
    '.info/serverTimeOffset': () => 0,
};

export const databaseModule = {
    ref: (_db, path = '') => ({ path }),
    get: vi.fn(async (reference) => snapshot(fake.read(reference.path))),
    set: vi.fn((reference, value) =>
        fake.apply('set', reference.path, value, () => fake.write(reference.path, value))
    ),
    update: vi.fn((reference, changes) =>
        fake.apply('update', reference.path, changes, () => {
            for (const [key, value] of Object.entries(changes)) {
                fake.write(`${reference.path}/${key}`, value);
            }
        })
    ),
    remove: vi.fn((reference) =>
        fake.apply('remove', reference.path, null, () => fake.write(reference.path, null))
    ),
    onDisconnect: vi.fn(() => ({ remove: () => Promise.resolve() })),
    onValue: vi.fn((reference, callback) => {
        const listener = { path: reference.path, callback };
        fake.listeners.add(listener);
        const value = INFO[reference.path]?.() ?? fake.read(reference.path);
        queueMicrotask(() => {
            if (fake.listeners.has(listener)) callback(snapshot(value));
        });
        return () => fake.listeners.delete(listener);
    }),
    serverTimestamp: () => SERVER_TIMESTAMP,
    goOffline: vi.fn(),
    goOnline: vi.fn(),
};

const auth = {
    authStateReady: async () => {},
    get currentUser() {
        return fake.uid ? { uid: fake.uid, isAnonymous: true } : null;
    },
};

export const authModule = {
    signInAnonymously: vi.fn(async () => ({ user: auth.currentUser })),
    signOut: vi.fn(async () => {}),
};

export const firebaseModule = {
    db: { fake: true },
    getParticipantAuth: async () => auth,
};

/** Lets pending promise callbacks run. */
export async function settle() {
    for (let i = 0; i < 10; i++) await new Promise((resolve) => setTimeout(resolve, 0));
}
