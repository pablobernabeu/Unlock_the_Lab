// Helpers that talk to the local Firebase emulators with administrative
// privileges (the owner token bypasses the database rules). Every URL is a
// 127.0.0.1 emulator address, so nothing here can reach production.
import { readFileSync } from 'node:fs';

const ROOT = new URL('../../', import.meta.url);
const DATABASE = 'http://127.0.0.1:9000';
const AUTH = 'http://127.0.0.1:9099';
const OWNER = { Authorization: 'Bearer owner' };

/** `KEY=value` lines of a dotenv file in the repository root. */
function readEnvFile(name) {
    const values = {};
    for (const line of readFileSync(new URL(name, ROOT), 'utf8').split(/\r?\n/)) {
        const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
        if (match) values[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
    }
    return values;
}

const testEnv = readEnvFile('.env.test');

/** The test build's project id, which the emulators must be started with. */
export const PROJECT_ID = testEnv.VITE_FIREBASE_PROJECT_ID ?? 'demo-unlock-the-lab';

/**
 * The database namespace the test build talks to: the first label of its
 * databaseURL (.env.test, or the default in src/lib/firebase-config.js).
 */
export const NAMESPACE = (() => {
    let url = testEnv.VITE_FIREBASE_DATABASE_URL;
    if (!url) {
        const source = readFileSync(new URL('src/lib/firebase-config.js', ROOT), 'utf8');
        url = /databaseURL:[^']*'([^']+)'/.exec(source)?.[1];
    }
    if (!url) throw new Error('Could not find the databaseURL of the test build.');
    const parsed = new URL(url);
    return parsed.searchParams.get('ns') ?? parsed.hostname.split('.')[0];
})();

/** The API key the test build signs in with (its persisted auth keys contain it). */
export const API_KEY = (() => {
    if (testEnv.VITE_FIREBASE_API_KEY) return testEnv.VITE_FIREBASE_API_KEY;
    const source = readFileSync(new URL('src/lib/firebase-config.js', ROOT), 'utf8');
    return /apiKey:[^']*'([^']+)'/.exec(source)[1];
})();

export const ADMIN = { email: 'admin@example.com', password: 'admin-password' };
export const NON_ADMIN = { email: 'someone@example.com', password: 'someone-password' };

/** The value the SDK sends for serverTimestamp(); the rules require it for timestamps. */
export const SERVER_TIMESTAMP = { '.sv': 'timestamp' };

function databaseUrl(path, query = '') {
    return `${DATABASE}/${path.replace(/^\/+/, '')}.json?ns=${NAMESPACE}${query}`;
}

async function request(url, init = {}) {
    const response = await fetch(url, init);
    if (!response.ok) {
        throw new Error(
            `${init.method ?? 'GET'} ${url}: ${response.status} ${await response.text()}`
        );
    }
    return response.status === 204 ? null : response.json();
}

/** Reads a path, bypassing the rules. */
export function readPath(path) {
    return request(databaseUrl(path), { headers: OWNER });
}

/** Replaces a path, bypassing the rules. */
export function writePath(path, value) {
    return request(databaseUrl(path), {
        method: 'PUT',
        headers: { ...OWNER, 'Content-Type': 'application/json' },
        body: JSON.stringify(value),
    });
}

/** Merges children into a path, bypassing the rules. */
export function updatePath(path, value) {
    return request(databaseUrl(path), {
        method: 'PATCH',
        headers: { ...OWNER, 'Content-Type': 'application/json' },
        body: JSON.stringify(value),
    });
}

/** The rules file that firebase.json gives to the app's namespace. */
export function rulesFile() {
    const config = JSON.parse(readFileSync(new URL('firebase.json', ROOT), 'utf8'));
    const targets = [config.database].flat().filter(Boolean);
    const target = targets.find(({ instance }) => instance === NAMESPACE);
    if (!target) {
        throw new Error(
            `firebase.json gives no database rules to ${NAMESPACE}, the namespace the app uses.`
        );
    }
    return new URL(target.rules, ROOT);
}

/** Loads the rules from firebase.json into the app's namespace. */
export function loadRules() {
    return request(`${DATABASE}/.settings/rules.json?ns=${NAMESPACE}`, {
        method: 'PUT',
        headers: OWNER,
        body: readFileSync(rulesFile(), 'utf8'),
    });
}

/**
 * Fails unless the rules are in force: a guest must not be able to write. An
 * emulator namespace without rules accepts every write.
 */
export async function assertRulesEnforced() {
    const response = await fetch(databaseUrl('e2e-rules-check'), {
        method: 'PUT',
        body: JSON.stringify(1),
    });
    if (response.status !== 401) {
        throw new Error(
            `A guest write to ${NAMESPACE} returned ${response.status}; the database rules are not loaded.`
        );
    }
}

/** Waits until both emulators answer (the database one can start a little later). */
export async function waitForEmulators({ timeoutMs = 60_000 } = {}) {
    const deadline = Date.now() + timeoutMs;
    let lastError = null;
    while (Date.now() < deadline) {
        try {
            await request(databaseUrl('', '&shallow=true'), { headers: OWNER });
            await request(`${AUTH}/emulator/v1/projects/${PROJECT_ID}/config`);
            return;
        } catch (error) {
            lastError = error;
            await new Promise((resolve) => setTimeout(resolve, 500));
        }
    }
    throw new Error(`The Firebase emulators did not answer: ${lastError?.message}`);
}

async function signUp({ email, password }) {
    const data = await request(
        `${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, returnSecureToken: true }),
        }
    );
    return data.localId;
}

/** Deletes every Auth account, then creates one admin and one non-admin password account. */
export async function resetAccounts() {
    await request(`${AUTH}/emulator/v1/projects/${PROJECT_ID}/accounts`, { method: 'DELETE' });
    const adminUid = await signUp(ADMIN);
    const nonAdminUid = await signUp(NON_ADMIN);
    return { adminUid, nonAdminUid };
}

/** Replaces the whole database with the fixture and allowlists the admin. */
export async function resetDatabase(fixture, adminUid) {
    await loadRules();
    await writePath('', { ...fixture, admins: { [adminUid]: true } });
}

/**
 * Resets accounts and data to the fixture. Specs call this before each test,
 * so every test starts from the same state whatever ran before it.
 * @param {object} fixture
 * @returns {Promise<{adminUid: string, nonAdminUid: string}>}
 */
export async function resetEmulators(fixture) {
    const accounts = await resetAccounts();
    await resetDatabase(fixture, accounts.adminUid);
    return accounts;
}

function base64url(value) {
    return Buffer.from(JSON.stringify(value)).toString('base64url');
}

/**
 * Signs in as `uid` without a password, the way a returning participant's
 * browser holds a persisted anonymous user. The Auth emulator accepts
 * unsigned custom tokens; the account has no providers, so the SDK treats it
 * as anonymous.
 * @param {string} uid
 * @returns {Promise<object>} the user as the Auth SDK persists it
 */
export async function persistedAnonymousUser(uid) {
    const now = Math.floor(Date.now() / 1000);
    const token = [
        base64url({ alg: 'none', typ: 'JWT' }),
        base64url({
            iss: 'e2e@example.com',
            sub: 'e2e@example.com',
            aud: 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit',
            iat: now,
            exp: now + 3600,
            uid,
        }),
        '',
    ].join('.');
    const data = await request(
        `${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${API_KEY}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, returnSecureToken: true }),
        }
    );
    return {
        uid,
        emailVerified: false,
        isAnonymous: true,
        providerData: [],
        stsTokenManager: {
            refreshToken: data.refreshToken,
            accessToken: data.idToken,
            expirationTime: Date.now() + Number(data.expiresIn) * 1000,
        },
        createdAt: String(Date.now()),
        lastLoginAt: String(Date.now()),
        apiKey: API_KEY,
        appName: '[DEFAULT]',
    };
}

/** The localStorage key under which the Auth SDK keeps the default app's user. */
export const AUTH_USER_KEY = `firebase:authUser:${API_KEY}:[DEFAULT]`;
