import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { appCheckSettings, startAppCheck } from '../../../src/lib/app-check.js';

const calls = vi.hoisted(() => ({ apps: [], log: [], sdkImports: 0, failSdkImport: false }));

vi.mock('firebase/app', () => ({
    getApps: vi.fn(() => calls.apps),
    initializeApp: vi.fn((config, name = '[DEFAULT]') => {
        const app = { name, options: config };
        calls.apps.push(app);
        return app;
    }),
}));

vi.mock('firebase/database', () => ({
    getDatabase: vi.fn((app) => {
        calls.log.push(`database:${app.name}`);
        return { kind: 'database', app };
    }),
    connectDatabaseEmulator: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
    initializeAuth: vi.fn((app, options) => {
        calls.log.push(`auth:${app.name}`);
        return { kind: 'auth', app, options };
    }),
    connectAuthEmulator: vi.fn(),
    indexedDBLocalPersistence: { type: 'LOCAL', storage: 'indexedDB' },
    browserLocalPersistence: { type: 'LOCAL', storage: 'localStorage' },
    browserSessionPersistence: { type: 'SESSION' },
}));

// Registered afresh by loadFirebase (vi.doMock), so that every load runs the factory and
// counts whether firebase.js imported the SDK at all.
function appCheckModule() {
    calls.sdkImports += 1;
    if (calls.failSdkImport) throw new Error('chunk failed to load');
    return {
        initializeAppCheck: vi.fn((app, options) => {
            calls.log.push(`appcheck:${app.name}`);
            return { kind: 'appCheck', app, options };
        }),
        ReCaptchaEnterpriseProvider: vi.fn(function ReCaptchaEnterpriseProvider(siteKey) {
            this.siteKey = siteKey;
        }),
    };
}

/** A fake SDK for startAppCheck, recording what it is given. */
function fakeSdk() {
    return {
        initializeAppCheck: vi.fn((app, options) => ({ kind: 'appCheck', app, options })),
        ReCaptchaEnterpriseProvider: vi.fn(function ReCaptchaEnterpriseProvider(siteKey) {
            this.siteKey = siteKey;
        }),
    };
}

const SETTINGS = { siteKey: 'site-key', debugToken: null };

afterEach(() => {
    delete globalThis.FIREBASE_APPCHECK_DEBUG_TOKEN;
});

describe('appCheckSettings', () => {
    it('leaves App Check off without a site key', () => {
        expect(appCheckSettings({})).toBeNull();
        expect(appCheckSettings({ siteKey: '' })).toBeNull();
        expect(appCheckSettings({ siteKey: '   ' })).toBeNull();
        expect(appCheckSettings({ siteKey: undefined, debugToken: 'token', dev: true })).toBeNull();
    });

    it('never turns it on with the emulators, which do not check tokens', () => {
        expect(appCheckSettings({ siteKey: 'site-key', useEmulators: true })).toBeNull();
        expect(
            appCheckSettings({
                siteKey: 'site-key',
                debugToken: 'token',
                useEmulators: true,
                dev: true,
            })
        ).toBeNull();
    });

    it('turns it on with a site key', () => {
        expect(appCheckSettings({ siteKey: ' site-key ' })).toEqual({
            siteKey: 'site-key',
            debugToken: null,
        });
    });

    it('uses a debug token on development servers only', () => {
        expect(appCheckSettings({ siteKey: 'site-key', debugToken: ' token ', dev: true })).toEqual(
            {
                siteKey: 'site-key',
                debugToken: 'token',
            }
        );
        expect(
            appCheckSettings({ siteKey: 'site-key', debugToken: 'token' }).debugToken
        ).toBeNull();
        expect(
            appCheckSettings({ siteKey: 'site-key', debugToken: '  ', dev: true }).debugToken
        ).toBeNull();
    });
});

describe('startAppCheck', () => {
    it('loads nothing when App Check is off', async () => {
        const loadSdk = vi.fn(async () => fakeSdk());
        expect(await startAppCheck({ name: 'a' }, null, loadSdk)).toBeNull();
        expect(await startAppCheck({ name: 'a' }, SETTINGS, null)).toBeNull();
        expect(loadSdk).not.toHaveBeenCalled();
    });

    it('starts reCAPTCHA Enterprise with automatic token refresh', async () => {
        const sdk = fakeSdk();
        const app = { name: '[DEFAULT]' };
        const appCheck = await startAppCheck(app, SETTINGS, async () => sdk);
        expect(sdk.ReCaptchaEnterpriseProvider).toHaveBeenCalledWith('site-key');
        expect(sdk.initializeAppCheck).toHaveBeenCalledWith(app, {
            provider: sdk.ReCaptchaEnterpriseProvider.mock.instances[0],
            isTokenAutoRefreshEnabled: true,
        });
        expect(appCheck).toEqual({ kind: 'appCheck', app, options: expect.any(Object) });
        expect(globalThis.FIREBASE_APPCHECK_DEBUG_TOKEN).toBeUndefined();
    });

    it('gives each app its own provider', async () => {
        const sdk = fakeSdk();
        const first = await startAppCheck({ name: '[DEFAULT]' }, SETTINGS, async () => sdk);
        const second = await startAppCheck({ name: 'admin' }, SETTINGS, async () => sdk);
        expect(first.options.provider).not.toBe(second.options.provider);
    });

    it('hands a debug token to the SDK before starting it', async () => {
        const sdk = fakeSdk();
        sdk.initializeAppCheck.mockImplementation(() => globalThis.FIREBASE_APPCHECK_DEBUG_TOKEN);
        const seen = await startAppCheck(
            { name: '[DEFAULT]' },
            { siteKey: 'site-key', debugToken: 'registered-token' },
            async () => sdk
        );
        expect(seen).toBe('registered-token');
    });

    it('rejects when the SDK cannot be loaded', async () => {
        await expect(
            startAppCheck({ name: 'admin' }, SETTINGS, async () => {
                throw new Error('offline');
            })
        ).rejects.toThrow('offline');
    });
});

/** Loads src/lib/firebase.js afresh with the given build variables. */
async function loadFirebase(env) {
    vi.resetModules();
    calls.apps.length = 0;
    calls.log.length = 0;
    calls.sdkImports = 0;
    vi.doMock('firebase/app-check', appCheckModule);
    for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value);
    const firebase = await import('../../../src/lib/firebase.js');
    return firebase;
}

describe('firebase.js with App Check', () => {
    let warn;

    beforeEach(() => {
        calls.failSdkImport = false;
        warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    it('starts App Check for the default app before its database and auth', async () => {
        const firebase = await loadFirebase({
            VITE_USE_EMULATORS: 'false',
            VITE_APPCHECK_SITE_KEY: 'site-key',
        });
        expect(calls.log).toEqual(['appcheck:[DEFAULT]', 'database:[DEFAULT]']);
        await firebase.getParticipantAuth();
        expect(calls.log).toEqual(['appcheck:[DEFAULT]', 'database:[DEFAULT]', 'auth:[DEFAULT]']);
        const { initializeAppCheck } = await import('firebase/app-check');
        expect(initializeAppCheck).toHaveBeenCalledWith(firebase.app, {
            provider: expect.objectContaining({ siteKey: 'site-key' }),
            isTokenAutoRefreshEnabled: true,
        });
    });

    it('starts App Check for the admin app before its database and auth', async () => {
        const firebase = await loadFirebase({
            VITE_USE_EMULATORS: 'false',
            VITE_APPCHECK_SITE_KEY: 'site-key',
        });
        calls.log.length = 0;
        const admin = await firebase.createAdminApp();
        expect(admin.app.name).toBe('admin');
        expect(calls.log).toEqual(['appcheck:admin', 'database:admin', 'auth:admin']);
    });

    it('does not load the SDK without a site key', async () => {
        const firebase = await loadFirebase({ VITE_USE_EMULATORS: 'false' });
        await firebase.getParticipantAuth();
        await firebase.createAdminApp();
        expect(calls.sdkImports).toBe(0);
        expect(calls.log).not.toContainEqual(expect.stringMatching(/^appcheck:/));
    });

    it('does not load the SDK with the emulators, even with a site key', async () => {
        const firebase = await loadFirebase({
            VITE_USE_EMULATORS: 'true',
            VITE_APPCHECK_SITE_KEY: 'site-key',
            VITE_APPCHECK_DEBUG_TOKEN: 'registered-token',
        });
        await firebase.createAdminApp();
        expect(calls.sdkImports).toBe(0);
        expect(globalThis.FIREBASE_APPCHECK_DEBUG_TOKEN).toBeUndefined();
    });

    it('uses the debug token on a development server against the live database', async () => {
        await loadFirebase({
            DEV: true,
            VITE_USE_EMULATORS: 'false',
            VITE_APPCHECK_SITE_KEY: 'site-key',
            VITE_APPCHECK_DEBUG_TOKEN: 'registered-token',
        });
        expect(globalThis.FIREBASE_APPCHECK_DEBUG_TOKEN).toBe('registered-token');
    });

    it('ignores a debug token in production builds', async () => {
        await loadFirebase({
            DEV: false,
            VITE_USE_EMULATORS: 'false',
            VITE_APPCHECK_SITE_KEY: 'site-key',
            VITE_APPCHECK_DEBUG_TOKEN: 'registered-token',
        });
        expect(calls.log).toContain('appcheck:[DEFAULT]');
        expect(globalThis.FIREBASE_APPCHECK_DEBUG_TOKEN).toBeUndefined();
    });

    it('still sets up the page when the SDK fails to load, with a warning', async () => {
        calls.failSdkImport = true;
        const firebase = await loadFirebase({
            VITE_USE_EMULATORS: 'false',
            VITE_APPCHECK_SITE_KEY: 'site-key',
        });
        expect(firebase.db.kind).toBe('database');
        expect(warn).toHaveBeenCalledWith(
            expect.stringContaining('App Check did not start'),
            expect.any(Error)
        );
    });

    it('lets the admin panel retry when the SDK fails to load', async () => {
        const firebase = await loadFirebase({
            VITE_USE_EMULATORS: 'false',
            VITE_APPCHECK_SITE_KEY: 'site-key',
        });
        const appCheck = await import('firebase/app-check');
        appCheck.initializeAppCheck.mockImplementationOnce(() => {
            throw new Error('reCAPTCHA failed');
        });
        await expect(firebase.createAdminApp()).rejects.toThrow('reCAPTCHA failed');
        calls.log.length = 0;
        const admin = await firebase.createAdminApp();
        expect(admin.app.name).toBe('admin');
        expect(calls.log).toEqual(['appcheck:admin', 'database:admin', 'auth:admin']);
    });
});
