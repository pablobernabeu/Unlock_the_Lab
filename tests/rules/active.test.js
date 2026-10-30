import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
    NOW,
    OTHER_SESSION_ID,
    SESSION_ID,
    anonymousDb,
    createRulesEnv,
    guestDb,
    presenceRecord,
    readAsOwner,
    seed,
    seedSession,
} from './helpers.js';

let env;

beforeAll(async () => {
    env = await createRulesEnv('active');
});

beforeEach(async () => {
    await env.clearDatabase();
    await seedSession(env, 'alice');
});

afterAll(async () => {
    await env.cleanup();
});

const path = (sessionId = SESSION_ID) => `active/${sessionId}`;

async function seedPresence(joinedAt = 1771630835301) {
    await seed(env, path(), { joinedAt, lastActive: joinedAt, uid: 'alice' });
}

describe('/active', () => {
    it('is publicly readable', async () => {
        await assertSucceeds(guestDb(env).ref('active').get());
    });

    it('lets the session owner announce presence, with or without a room', async () => {
        const db = anonymousDb(env, 'alice');
        await assertSucceeds(db.ref(path()).set(presenceRecord('alice')));
        await assertSucceeds(db.ref(path()).set(presenceRecord('alice', { room: 'OSLO-2026' })));
    });

    it('lets the heartbeat update lastActive only, keeping joinedAt', async () => {
        await seedPresence();
        await assertSucceeds(anonymousDb(env, 'alice').ref(path()).update({ lastActive: NOW }));
        expect((await readAsOwner(env, path())).joinedAt).toBe(1771630835301);
    });

    it('allows rewriting the record with joinedAt unchanged', async () => {
        await seedPresence();
        const record = presenceRecord('alice', { joinedAt: 1771630835301 });
        await assertSucceeds(anonymousDb(env, 'alice').ref(path()).set(record));
    });

    it('lets the owner remove presence and register onDisconnect().remove()', async () => {
        await seedPresence();
        const db = anonymousDb(env, 'alice');
        await assertSucceeds(db.ref(path()).onDisconnect().remove());
        await assertSucceeds(db.ref(path()).remove());
    });

    it('rejects a heartbeat that would re-create a cleared record', async () => {
        await assertFails(anonymousDb(env, 'alice').ref(path()).update({ lastActive: NOW }));
    });

    it.each([
        ['joinedAt', 1771630835301],
        ['lastActive', 1771630835301],
    ])('requires server time for %s', async (field, value) => {
        const record = presenceRecord('alice', { [field]: value });
        await assertFails(anonymousDb(env, 'alice').ref(path()).set(record));
    });

    it('rejects moving joinedAt to a client-chosen time', async () => {
        await seedPresence();
        await assertFails(anonymousDb(env, 'alice').ref(`${path()}/joinedAt`).set(1));
    });

    it.each(['joinedAt', 'lastActive', 'uid'])('requires %s', async (field) => {
        const record = presenceRecord('alice');
        delete record[field];
        await assertFails(anonymousDb(env, 'alice').ref(path()).set(record));
    });

    it('rejects large or unknown payloads', async () => {
        const db = anonymousDb(env, 'alice');
        await assertFails(
            db.ref(path()).set(presenceRecord('alice', { junk: 'x'.repeat(100_000) }))
        );
        await assertFails(db.ref(path()).set(presenceRecord('alice', { nested: { a: { b: 1 } } })));
        await assertFails(db.ref(path()).set('x'.repeat(100_000)));
    });

    it('rejects a malformed room', async () => {
        const record = presenceRecord('alice', { room: 'x'.repeat(1000) });
        await assertFails(anonymousDb(env, 'alice').ref(path()).set(record));
    });

    it('rejects unauthenticated writes', async () => {
        await assertFails(guestDb(env).ref(path()).set(presenceRecord('alice')));
    });

    it("rejects writing or removing another participant's presence", async () => {
        await seedPresence();
        const db = anonymousDb(env, 'mallory');
        await assertFails(db.ref(path()).set(presenceRecord('mallory')));
        await assertFails(db.ref(path()).remove());
    });

    it('rejects a record claimed for another uid', async () => {
        await assertFails(anonymousDb(env, 'alice').ref(path()).set(presenceRecord('bob')));
    });

    it('rejects writes without a /sessions record', async () => {
        const db = anonymousDb(env, 'alice');
        await assertFails(db.ref(path(OTHER_SESSION_ID)).set(presenceRecord('alice')));
    });
});
