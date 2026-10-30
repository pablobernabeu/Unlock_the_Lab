import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
    OTHER_SESSION_ID,
    SESSION_ID,
    anonymousDb,
    createRulesEnv,
    guestDb,
    rankingRecord,
    seed,
    seedSession,
} from './helpers.js';

let env;

beforeAll(async () => {
    env = await createRulesEnv('rankings');
});

beforeEach(async () => {
    await env.clearDatabase();
    await seedSession(env, 'alice');
});

afterAll(async () => {
    await env.cleanup();
});

const path = (sessionId = SESSION_ID) => `rankings/${sessionId}`;
const CRITERIA = ['title', 'access', 'source', 'theory', 'methods', 'conclusion'];

describe('/rankings', () => {
    it('is publicly readable', async () => {
        await assertSucceeds(guestDb(env).ref('rankings').get());
    });

    it('lets the session owner save an allocation of 20 tokens', async () => {
        await assertSucceeds(anonymousDb(env, 'alice').ref(path()).set(rankingRecord('alice')));
    });

    it('accepts all tokens on one criterion and a room code', async () => {
        const record = rankingRecord('alice', {
            title: 0,
            access: 0,
            source: 0,
            theory: 0,
            methods: 20,
            conclusion: 0,
            room: 'OSLO-2026',
        });
        await assertSucceeds(anonymousDb(env, 'alice').ref(path()).set(record));
    });

    it.each([
        ['19 tokens', { methods: 5 }],
        ['21 tokens', { methods: 7 }],
        [
            'a negative count balanced by a large one',
            { title: 25, access: -5, source: 0, theory: 0, methods: 0, conclusion: 0 },
        ],
        ['fractional counts', { title: 2.5, access: 2.5 }],
        [
            'more than 20 on one criterion',
            { title: 21, access: 0, source: 0, theory: 0, methods: 0, conclusion: -1 },
        ],
        ['a string count', { title: '2' }],
    ])('rejects %s', async (_label, tokens) => {
        const record = rankingRecord('alice', tokens);
        await assertFails(anonymousDb(env, 'alice').ref(path()).set(record));
    });

    it.each([...CRITERIA, 'userName', 'timestamp', 'uid'])('requires %s', async (field) => {
        const record = rankingRecord('alice');
        delete record[field];
        await assertFails(anonymousDb(env, 'alice').ref(path()).set(record));
    });

    it('is create-only, even for the owner', async () => {
        await seed(env, path(), { ...rankingRecord('alice'), timestamp: 1771632076449 });
        const db = anonymousDb(env, 'alice');
        await assertFails(db.ref(path()).set(rankingRecord('alice')));
        await assertFails(db.ref(`${path()}/title`).set(2));
        await assertFails(db.ref(path()).remove());
    });

    it('rejects unauthenticated writes', async () => {
        await assertFails(guestDb(env).ref(path()).set(rankingRecord('alice')));
    });

    it("rejects writes to another participant's session", async () => {
        await assertFails(anonymousDb(env, 'mallory').ref(path()).set(rankingRecord('mallory')));
    });

    it('rejects a record claimed for another uid', async () => {
        await assertFails(anonymousDb(env, 'alice').ref(path()).set(rankingRecord('bob')));
    });

    it('rejects writes without a /sessions record', async () => {
        const db = anonymousDb(env, 'alice');
        await assertFails(db.ref(path(OTHER_SESSION_ID)).set(rankingRecord('alice')));
    });

    it('requires a server timestamp', async () => {
        const record = rankingRecord('alice', { timestamp: Date.now() });
        await assertFails(anonymousDb(env, 'alice').ref(path()).set(record));
    });

    it.each(['<img src=x onerror=alert(1)>', '', 'Red Bear'])(
        'rejects the user name %j',
        async (userName) => {
            const record = rankingRecord('alice', { userName });
            await assertFails(anonymousDb(env, 'alice').ref(path()).set(record));
        }
    );

    it('rejects a malformed room', async () => {
        const record = rankingRecord('alice', { room: '<b>' });
        await assertFails(anonymousDb(env, 'alice').ref(path()).set(record));
    });

    it('rejects unknown fields', async () => {
        const record = rankingRecord('alice', { novelty: 0 });
        await assertFails(anonymousDb(env, 'alice').ref(path()).set(record));
    });
});
