/**
 * Firebase set-up for all pages. No Analytics.
 *
 * Development (`npm run dev`) and test builds set VITE_USE_EMULATORS=true and
 * talk to the local emulators, never to the production database. Auth is
 * loaded on demand so the public dashboard, which only reads, does not ship it.
 * Builds made with VITE_APPCHECK_SITE_KEY start App Check for each app before
 * its database or auth is used (src/lib/app-check.js).
 */
import { getApps, initializeApp } from 'firebase/app';
import { connectDatabaseEmulator, getDatabase } from 'firebase/database';
import { appCheckSettings, startAppCheck } from './app-check.js';
import { firebaseConfig } from './firebase-config.js';

export const EMULATOR_HOST = '127.0.0.1';
export const DATABASE_EMULATOR_PORT = 9000;
export const AUTH_EMULATOR_PORT = 9099;
export const ADMIN_APP_NAME = 'admin';

/** True when this build talks to the local emulators. */
export const usingEmulators = import.meta.env.VITE_USE_EMULATORS === 'true';

if (import.meta.env.DEV && !usingEmulators) {
    console.warn('[firebase] This development build uses the PRODUCTION database.');
}

const appCheck = appCheckSettings({
    siteKey: import.meta.env.VITE_APPCHECK_SITE_KEY,
    // Read only in development, so that a production bundle never contains the token.
    debugToken: import.meta.env.DEV ? import.meta.env.VITE_APPCHECK_DEBUG_TOKEN : undefined,
    useEmulators: usingEmulators,
    dev: import.meta.env.DEV,
});

// Written out here so that, without a site key or with the emulators, the condition is
// false at build time and the bundle contains none of the App Check SDK.
const loadAppCheck =
    import.meta.env.VITE_APPCHECK_SITE_KEY && !usingEmulators
        ? () => import('firebase/app-check')
        : null;

function connectDatabase(database) {
    if (usingEmulators) connectDatabaseEmulator(database, EMULATOR_HOST, DATABASE_EMULATOR_PORT);
    return database;
}

function connectAuth(auth, connectAuthEmulator) {
    if (usingEmulators) {
        connectAuthEmulator(auth, `http://${EMULATOR_HOST}:${AUTH_EMULATOR_PORT}`, {
            disableWarnings: true,
        });
    }
    return auth;
}

/** The default Firebase app, used by participants and the dashboard. */
export const app = initializeApp(firebaseConfig);

if (loadAppCheck) {
    try {
        await startAppCheck(app, appCheck, loadAppCheck);
    } catch (error) {
        // Nothing can retry a failed module, so carry on: the page still works until
        // App Check is enforced, and after that the database refuses it visibly.
        console.warn('[firebase] App Check did not start, so requests carry no token.', error);
    }
}

/** Realtime Database of the default app. */
export const db = connectDatabase(getDatabase(app));

/**
 * Shares one pending set-up between callers but forgets a failed one, so a
 * retry after a network blip (the auth chunk failing to load) can succeed.
 * @template T
 * @param {() => Promise<T>} create
 * @returns {() => Promise<T>}
 */
function retryableOnce(create) {
    let pending = null;
    return () => {
        pending ??= create().catch((error) => {
            pending = null;
            throw error;
        });
        return pending;
    };
}

/**
 * Auth for participants (anonymous sign-in). Persistence is local (IndexedDB,
 * then localStorage), so the anonymous user, and with it the uid that owns
 * the session, survives reloads; v1 used the same default app, so v1
 * participants keep their uid.
 * @returns {Promise<import('firebase/auth').Auth>}
 */
export const getParticipantAuth = retryableOnce(() =>
    import('firebase/auth').then(
        ({
            browserLocalPersistence,
            connectAuthEmulator,
            indexedDBLocalPersistence,
            initializeAuth,
        }) =>
            connectAuth(
                initializeAuth(app, {
                    persistence: [indexedDBLocalPersistence, browserLocalPersistence],
                }),
                connectAuthEmulator
            )
    )
);

/**
 * A separate Firebase app named 'admin' for the admin panel, so an admin's
 * email sign-in never replaces a participant's anonymous user in the same
 * browser. Its sign-in lasts for the browser tab only (session persistence).
 * @returns {Promise<{app: import('firebase/app').FirebaseApp, db: import('firebase/database').Database,
 *   auth: import('firebase/auth').Auth}>}
 */
export const createAdminApp = retryableOnce(async () => {
    const adminApp =
        getApps().find(({ name }) => name === ADMIN_APP_NAME) ??
        initializeApp(firebaseConfig, ADMIN_APP_NAME);
    const [{ browserSessionPersistence, connectAuthEmulator, initializeAuth }] = await Promise.all([
        import('firebase/auth'),
        startAppCheck(adminApp, appCheck, loadAppCheck),
    ]);
    return {
        app: adminApp,
        db: connectDatabase(getDatabase(adminApp)),
        auth: connectAuth(
            initializeAuth(adminApp, { persistence: browserSessionPersistence }),
            connectAuthEmulator
        ),
    };
});
