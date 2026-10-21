// Helpers that talk to the local Firebase emulators with administrative
// privileges (the owner token bypasses the database rules).
import { readFileSync } from 'node:fs';

export const PROJECT_ID = 'unlock-the-lab-workshop';
export const NAMESPACE = 'unlock-the-lab-workshop-default-rtdb';
const DATABASE = 'http://127.0.0.1:9000';
const AUTH = 'http://127.0.0.1:9099';
const OWNER = { Authorization: 'Bearer owner' };

export const ADMIN = { email: 'admin@example.com', password: 'admin-password' };
export const NON_ADMIN = { email: 'someone@example.com', password: 'someone-password' };

function databaseUrl(path) {
    return `${DATABASE}/${path.replace(/^\/+/, '')}.json?ns=${NAMESPACE}`;
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

export function readPath(path) {
    return request(databaseUrl(path), { headers: OWNER });
}

export function writePath(path, value) {
    return request(databaseUrl(path), {
        method: 'PUT',
        headers: { ...OWNER, 'Content-Type': 'application/json' },
        body: JSON.stringify(value),
    });
}

export function loadRules() {
    return request(`${DATABASE}/.settings/rules.json?ns=${NAMESPACE}`, {
        method: 'PUT',
        headers: OWNER,
        body: readFileSync(new URL('../../database.rules.json', import.meta.url), 'utf8'),
    });
}

async function signUp({ email, password }) {
    const data = await request(
        `${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=test-api-key`,
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
    await signUp(NON_ADMIN);
    return adminUid;
}

/** Replaces the whole database with the fixture and allowlists the admin. */
export async function resetDatabase(fixture, adminUid) {
    await loadRules();
    await writePath('', { ...fixture, admins: { [adminUid]: true } });
}
