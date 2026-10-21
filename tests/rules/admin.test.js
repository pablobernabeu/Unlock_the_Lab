import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
    ADMIN_UID,
    NOW,
    SESSION_ID,
    anonymousDb,
    createRulesEnv,
    guestDb,
    leaderboardEntry,
    legacyRating,
    passwordDb,
    presenceRecord,
    rankingRecord,
    readAsOwner,
    seed,
    seedAdmin,
    sessionRecord,
} from './helpers.js';

let env;

const DATA_NODES = ['sessions', 'ratings', 'leaderboard', 'rankings', 'active'];

beforeAll(async () => {
    env = await createRulesEnv('admin');
});

beforeEach(async () => {
    await env.clearDatabase();
    await seedAdmin(env);
    await seed(env, `sessions/${SESSION_ID}`, sessionRecord('alice'));
    await seed(env, `ratings/STUDY-1/${SESSION_ID}`, legacyRating('alice'));
    await seed(env, `leaderboard/${SESSION_ID}`, leaderboardEntry('alice'));
    await seed(env, `rankings/${SESSION_ID}`, rankingRecord('alice'));
    await seed(env, `active/${SESSION_ID}`, presenceRecord('alice'));
});

afterAll(async () => {
    await env.cleanup();
});

const adminDb = () => passwordDb(env, ADMIN_UID);

describe('/control/sessionsEndedAt', () => {
    it('is publicly readable so clients can react to it', async () => {
        await assertSucceeds(guestDb(env).ref('control/sessionsEndedAt').get());
    });

    it('can be set to server time by an admin', async () => {
        await assertSucceeds(adminDb().ref('control/sessionsEndedAt').set(NOW));
        await assertSucceeds(adminDb().ref('control').set({ sessionsEndedAt: NOW }));
    });

    it('rejects a client-chosen time, even from an admin', async () => {
        await assertFails(
            adminDb()
                .ref('control/sessionsEndedAt')
                .set(Date.now() + 86_400_000)
        );
    });

    it('rejects unknown control fields', async () => {
        await assertFails(adminDb().ref('control/maintenance').set(true));
    });

    it('cannot be set by participants, guests or password accounts that are not admins', async () => {
        await assertFails(guestDb(env).ref('control/sessionsEndedAt').set(NOW));
        await assertFails(anonymousDb(env, 'alice').ref('control/sessionsEndedAt').set(NOW));
        await assertFails(passwordDb(env, 'mallory').ref('control/sessionsEndedAt').set(NOW));
    });
});

describe('/admins', () => {
    it('lets a user read only their own entry', async () => {
        const snapshot = await assertSucceeds(adminDb().ref(`admins/${ADMIN_UID}`).get());
        expect(snapshot.val()).toBe(true);
        await assertSucceeds(anonymousDb(env, 'alice').ref('admins/alice').get());
    });

    it('hides other entries and the list itself', async () => {
        await assertFails(guestDb(env).ref(`admins/${ADMIN_UID}`).get());
        await assertFails(anonymousDb(env, 'alice').ref(`admins/${ADMIN_UID}`).get());
        await assertFails(adminDb().ref('admins').get());
        await assertFails(guestDb(env).ref('/').get());
    });

    it('cannot be written by anyone through the client, admins included', async () => {
        await assertFails(anonymousDb(env, 'alice').ref('admins/alice').set(true));
        await assertFails(passwordDb(env, 'mallory').ref('admins/mallory').set(true));
        await assertFails(adminDb().ref('admins/alice').set(true));
        await assertFails(adminDb().ref(`admins/${ADMIN_UID}`).remove());
    });
});

describe('admin powers', () => {
    it.each(DATA_NODES)('lets an admin delete the whole /%s node', async (node) => {
        await assertSucceeds(adminDb().ref(node).remove());
        expect(await readAsOwner(env, node)).toBeNull();
    });

    it('lets an admin delete all participant data in one multi-path update', async () => {
        const deletion = Object.fromEntries(DATA_NODES.map((node) => [node, null]));
        await assertSucceeds(adminDb().ref().update(deletion));
        for (const node of DATA_NODES) {
            expect(await readAsOwner(env, node)).toBeNull();
        }
    });

    it('lets an admin end sessions and clear presence together', async () => {
        await assertSucceeds(
            adminDb().ref().update({ 'control/sessionsEndedAt': NOW, active: null })
        );
    });

    it('lets an admin remove a single record', async () => {
        await assertSucceeds(adminDb().ref(`leaderboard/${SESSION_ID}`).remove());
        await assertSucceeds(adminDb().ref(`ratings/STUDY-1/${SESSION_ID}`).remove());
    });

    it('still validates records an admin writes', async () => {
        const injected = leaderboardEntry(ADMIN_UID, { userName: '<img src=x onerror=alert(1)>' });
        await assertFails(
            adminDb().ref('leaderboard/session_1771634502453_iienlw3th').set(injected)
        );
    });

    it.each(DATA_NODES)('does not let a participant delete the whole /%s node', async (node) => {
        await assertFails(anonymousDb(env, 'alice').ref(node).remove());
    });

    it.each(DATA_NODES)('does not treat any password account as an admin (/%s)', async (node) => {
        await assertFails(passwordDb(env, 'mallory').ref(node).remove());
    });

    it('rejects the multi-path deletion for non-admins', async () => {
        const deletion = Object.fromEntries(DATA_NODES.map((node) => [node, null]));
        await assertFails(passwordDb(env, 'mallory').ref().update(deletion));
        await assertFails(guestDb(env).ref().update(deletion));
    });

    it('rejects unknown top-level nodes for everyone', async () => {
        await assertFails(adminDb().ref('scratch').set({ note: 'x' }));
        await assertFails(anonymousDb(env, 'alice').ref('scratch').set({ note: 'x' }));
    });
});

describe('public reads', () => {
    it.each([...DATA_NODES, 'control'])('lets anyone read /%s', async (node) => {
        await assertSucceeds(guestDb(env).ref(node).get());
    });

    it('lets anyone query by room where an index exists', async () => {
        for (const node of ['sessions', 'leaderboard', 'rankings']) {
            await assertSucceeds(
                guestDb(env).ref(node).orderByChild('room').equalTo('OSLO-2026').get()
            );
        }
    });
});
