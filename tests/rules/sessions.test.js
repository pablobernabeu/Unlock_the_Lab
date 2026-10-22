import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
    SESSION_ID,
    anonymousDb,
    createRulesEnv,
    guestDb,
    seedSession,
    sessionRecord,
} from './helpers.js';

let env;

beforeAll(async () => {
    env = await createRulesEnv('sessions');
});

beforeEach(async () => {
    await env.clearDatabase();
});

afterAll(async () => {
    await env.cleanup();
});

const path = (sessionId = SESSION_ID) => `sessions/${sessionId}`;

describe('/sessions', () => {
    it('is publicly readable', async () => {
        await seedSession(env, 'alice');
        await assertSucceeds(guestDb(env).ref('sessions').get());
    });

    it('lets a signed-in participant create their own session', async () => {
        await assertSucceeds(anonymousDb(env, 'alice').ref(path()).set(sessionRecord('alice')));
    });

    it('accepts a room code and the end-of-workshop feedback mode', async () => {
        const record = sessionRecord('alice', {
            room: 'OSLO-2026',
            feedbackMode: 'end',
            locale: 'pt-BR',
        });
        await assertSucceeds(anonymousDb(env, 'alice').ref(path()).set(record));
    });

    it('accepts v1 session ids when a v1 participant resumes', async () => {
        const legacyId = 'session_1772371401905_tajc9odyd';
        await assertSucceeds(
            anonymousDb(env, 'alice').ref(path(legacyId)).set(sessionRecord('alice'))
        );
    });

    it('rejects unauthenticated writes', async () => {
        await assertFails(guestDb(env).ref(path()).set(sessionRecord('alice')));
    });

    it('rejects a session claimed for another uid', async () => {
        await assertFails(anonymousDb(env, 'mallory').ref(path()).set(sessionRecord('alice')));
    });

    it('is create-only, even for the owner', async () => {
        await seedSession(env, 'alice');
        const db = anonymousDb(env, 'alice');
        await assertFails(db.ref(path()).set(sessionRecord('alice')));
        await assertFails(db.ref(`${path()}/room`).set('OSLO'));
        await assertFails(db.ref(path()).remove());
    });

    it('does not let another participant take over an existing session', async () => {
        await seedSession(env, 'alice');
        await assertFails(anonymousDb(env, 'mallory').ref(path()).set(sessionRecord('mallory')));
    });

    it.each([
        'hello',
        'session_123_abc',
        'session_1771630835301_',
        'session_1771630835301_ABC',
        'session_1771630835301_abc-def',
        'session_1771630835301_abcdefghijklm',
        'session_177163083530123_abc',
    ])('rejects the malformed session id %s', async (sessionId) => {
        await assertFails(
            anonymousDb(env, 'alice').ref(path(sessionId)).set(sessionRecord('alice'))
        );
    });

    it('requires a server timestamp for createdAt', async () => {
        const record = sessionRecord('alice', { createdAt: Date.now() });
        await assertFails(anonymousDb(env, 'alice').ref(path()).set(record));
    });

    it.each(['uid', 'createdAt', 'contentVersion', 'appVersion', 'locale', 'feedbackMode'])(
        'requires %s',
        async (field) => {
            const record = sessionRecord('alice');
            delete record[field];
            await assertFails(anonymousDb(env, 'alice').ref(path()).set(record));
        }
    );

    it.each([
        ['contentVersion', 0],
        ['contentVersion', 2.5],
        ['contentVersion', '2'],
        ['appVersion', '<script>alert(1)</script>'],
        ['appVersion', 'x'.repeat(33)],
        ['locale', 'english'],
        ['locale', 'en_GB'],
        ['feedbackMode', 'later'],
        ['room', 'x'],
        ['room', 'A'],
        ['room', '<b>ROOM</b>'],
        ['room', 'ROOM-NAME-THAT-IS-TOO-LONG'],
    ])('rejects %s = %j', async (field, value) => {
        const record = sessionRecord('alice', { [field]: value });
        await assertFails(anonymousDb(env, 'alice').ref(path()).set(record));
    });

    it('rejects unknown fields', async () => {
        const record = sessionRecord('alice', { userAgent: 'x'.repeat(1000) });
        await assertFails(anonymousDb(env, 'alice').ref(path()).set(record));
    });
});
