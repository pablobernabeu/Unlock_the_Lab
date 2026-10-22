import { readFileSync } from 'node:fs';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { serverTimestamp } from 'firebase/database';

const RULES = readFileSync(new URL('../../database.rules.json', import.meta.url), 'utf8');

export const SESSION_ID = 'session_1771630835301_gj69lmk1o';
export const OTHER_SESSION_ID = 'session_1771634502453_iienlw3th';
export const ADMIN_UID = 'admin-uid';

// The placeholder the SDK sends for serverTimestamp(); the rules require it via `=== now`.
export const NOW = serverTimestamp();

/**
 * Each test file uses its own database namespace so files can run in parallel
 * against the same emulator without clearing each other's data.
 */
export async function createRulesEnv(name) {
    const emulatorHost = process.env.FIREBASE_DATABASE_EMULATOR_HOST;
    if (!emulatorHost) {
        throw new Error('The database emulator is not running. Use `npm run test:rules`.');
    }
    const separator = emulatorHost.lastIndexOf(':');
    return initializeTestEnvironment({
        projectId: `demo-utl-${name}`,
        database: {
            host: emulatorHost.slice(0, separator),
            port: Number(emulatorHost.slice(separator + 1)),
            rules: RULES,
        },
    });
}

export function guestDb(env) {
    return env.unauthenticatedContext().database();
}

export function anonymousDb(env, uid) {
    return env
        .authenticatedContext(uid, { firebase: { sign_in_provider: 'anonymous' } })
        .database();
}

// A password account is not an admin unless it is listed under /admins (v1 trusted any password account).
export function passwordDb(env, uid) {
    return env
        .authenticatedContext(uid, {
            email: `${uid}@example.org`,
            firebase: { sign_in_provider: 'password' },
        })
        .database();
}

export async function seed(env, path, value) {
    await env.withSecurityRulesDisabled((context) => context.database().ref(path).set(value));
}

export async function seedSession(env, uid, sessionId = SESSION_ID) {
    await seed(env, `sessions/${sessionId}`, sessionRecord(uid));
}

export async function seedAdmin(env, uid = ADMIN_UID) {
    await seed(env, `admins/${uid}`, true);
}

export async function readAsOwner(env, path) {
    let value;
    await env.withSecurityRulesDisabled(async (context) => {
        value = (await context.database().ref(path).get()).val();
    });
    return value;
}

export function sessionRecord(uid, extra = {}) {
    return {
        uid,
        createdAt: NOW,
        contentVersion: 2,
        appVersion: '2.0.0',
        locale: 'en',
        feedbackMode: 'each',
        ...extra,
    };
}

export function legacyRating(uid, extra = {}) {
    return { rating: 5, prediction: 4, responseTime: 59837, timestamp: NOW, uid, ...extra };
}

export function ratingRecord(uid, extra = {}) {
    return {
        ...legacyRating(uid),
        contentVersion: 2,
        feedbackShown: true,
        target: 4.37,
        score: 96,
        trial: 1,
        locale: 'en',
        ...extra,
    };
}

export function leaderboardEntry(uid, extra = {}) {
    return { score: 88, papersRated: 1, timestamp: NOW, uid, userName: 'Red Bear 76', ...extra };
}

export function rankingRecord(uid, extra = {}) {
    return {
        title: 2,
        access: 3,
        source: 3,
        theory: 4,
        methods: 6,
        conclusion: 2,
        userName: 'Red Bear 76',
        timestamp: NOW,
        uid,
        ...extra,
    };
}

export function presenceRecord(uid, extra = {}) {
    return { joinedAt: NOW, lastActive: NOW, uid, ...extra };
}
