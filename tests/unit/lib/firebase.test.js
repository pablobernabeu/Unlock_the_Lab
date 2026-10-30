import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const calls = vi.hoisted(() => ({ apps: [] }));

vi.mock('firebase/app', () => ({
    getApps: vi.fn(() => calls.apps),
    initializeApp: vi.fn((config, name = '[DEFAULT]') => {
        const app = { name, options: config };
        calls.apps.push(app);
        return app;
    }),
}));

vi.mock('firebase/database', () => ({
    getDatabase: vi.fn((app) => ({ kind: 'database', app })),
    connectDatabaseEmulator: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
    initializeAuth: vi.fn((app, options) => ({ kind: 'auth', app, options })),
    connectAuthEmulator: vi.fn(),
    indexedDBLocalPersistence: { type: 'LOCAL', storage: 'indexedDB' },
    browserLocalPersistence: { type: 'LOCAL', storage: 'localStorage' },
    browserSessionPersistence: { type: 'SESSION' },
}));

vi.mock('firebase/analytics', () => {
    throw new Error('Analytics must not be imported');
});

async function loadFirebase(useEmulators) {
    vi.resetModules();
    calls.apps.length = 0;
    vi.stubEnv('VITE_USE_EMULATORS', useEmulators);
    const firebase = await import('../../../src/lib/firebase.js');
    const database = await import('firebase/database');
    const auth = await import('firebase/auth');
    const app = await import('firebase/app');
    return { firebase, database, auth, app };
}

beforeEach(() => {
    vi.clearAllMocks();
});

afterEach(() => {
    vi.unstubAllEnvs();
});

describe('firebase.js with emulators', () => {
    it('connects the database and participant auth to the local emulators', async () => {
        const { firebase, database, auth } = await loadFirebase('true');
        expect(firebase.usingEmulators).toBe(true);
        expect(database.connectDatabaseEmulator).toHaveBeenCalledWith(
            firebase.db,
            '127.0.0.1',
            9000
        );

        const participantAuth = await firebase.getParticipantAuth();
        expect(auth.connectAuthEmulator).toHaveBeenCalledWith(
            participantAuth,
            'http://127.0.0.1:9099',
            {
                disableWarnings: true,
            }
        );
        expect(await firebase.getParticipantAuth()).toBe(participantAuth);
        expect(auth.initializeAuth).toHaveBeenCalledTimes(1);
    });
});

describe('firebase.js in production builds', () => {
    it('uses the production project and never the emulators', async () => {
        const { firebase, database, auth } = await loadFirebase('false');
        expect(firebase.usingEmulators).toBe(false);
        expect(firebase.app.options.databaseURL).toBe(
            'https://unlock-the-lab-workshop-default-rtdb.europe-west1.firebasedatabase.app'
        );
        expect(firebase.app.options).not.toHaveProperty('measurementId');
        expect(database.connectDatabaseEmulator).not.toHaveBeenCalled();
        await firebase.getParticipantAuth();
        expect(auth.connectAuthEmulator).not.toHaveBeenCalled();
    });

    it('gives participants local persistence so their uid survives reloads', async () => {
        const { firebase, auth } = await loadFirebase('false');
        const participantAuth = await firebase.getParticipantAuth();
        expect(participantAuth.app.name).toBe('[DEFAULT]');
        expect(participantAuth.options.persistence).toEqual([
            auth.indexedDBLocalPersistence,
            auth.browserLocalPersistence,
        ]);
    });
});

describe('failed set-up', () => {
    it('is not cached, so participants can retry signing in', async () => {
        const { firebase, auth } = await loadFirebase('false');
        auth.initializeAuth.mockImplementationOnce(() => {
            throw new Error('chunk failed to load');
        });
        await expect(firebase.getParticipantAuth()).rejects.toThrow('chunk failed to load');
        const participantAuth = await firebase.getParticipantAuth();
        expect(participantAuth.kind).toBe('auth');
        expect(await firebase.getParticipantAuth()).toBe(participantAuth);
    });

    it('is not cached for the admin app either', async () => {
        const { firebase, auth } = await loadFirebase('false');
        auth.initializeAuth.mockImplementationOnce(() => {
            throw new Error('offline');
        });
        await expect(firebase.createAdminApp()).rejects.toThrow('offline');
        const admin = await firebase.createAdminApp();
        expect(admin.app.name).toBe('admin');
        expect(await firebase.createAdminApp()).toBe(admin);
    });
});

describe('createAdminApp', () => {
    it('uses a separate app named "admin" with session persistence', async () => {
        const { firebase, auth, app } = await loadFirebase('true');
        const admin = await firebase.createAdminApp();
        expect(app.initializeApp).toHaveBeenLastCalledWith(expect.any(Object), 'admin');
        expect(admin.app.name).toBe('admin');
        expect(admin.db.app).toBe(admin.app);
        expect(admin.auth.app).toBe(admin.app);
        expect(admin.auth.options.persistence).toBe(auth.browserSessionPersistence);
        expect(admin.auth).not.toBe(await firebase.getParticipantAuth());
        expect(await firebase.createAdminApp()).toBe(admin);
    });
});

describe('firebase-config.js', () => {
    it('can be overridden by VITE_FIREBASE_* variables for forks', async () => {
        vi.resetModules();
        vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'my-fork');
        vi.stubEnv('VITE_FIREBASE_DATABASE_URL', 'https://my-fork-default-rtdb.firebaseio.com');
        const { firebaseConfig } = await import('../../../src/lib/firebase-config.js');
        expect(firebaseConfig.projectId).toBe('my-fork');
        expect(firebaseConfig.databaseURL).toBe('https://my-fork-default-rtdb.firebaseio.com');
        expect(firebaseConfig.apiKey).toBe('AIzaSyCjLzq8QNQqhGOpTJy3tzwuQrovMm6Vdi4');
    });
});
