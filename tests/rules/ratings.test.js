import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
    OTHER_SESSION_ID,
    SESSION_ID,
    anonymousDb,
    createRulesEnv,
    guestDb,
    legacyRating,
    ratingRecord,
    seed,
    seedSession,
} from './helpers.js';

let env;

beforeAll(async () => {
    env = await createRulesEnv('ratings');
});

beforeEach(async () => {
    await env.clearDatabase();
    await seedSession(env, 'alice');
});

afterAll(async () => {
    await env.cleanup();
});

const path = (studyId = 'STUDY-1', sessionId = SESSION_ID) => `ratings/${studyId}/${sessionId}`;

describe('/ratings', () => {
    it('is publicly readable', async () => {
        await assertSucceeds(guestDb(env).ref('ratings').get());
    });

    it('lets the session owner write a full v2 rating', async () => {
        const record = ratingRecord('alice', { room: 'OSLO-2026', trial: 48 });
        await assertSucceeds(anonymousDb(env, 'alice').ref(path('STUDY-48')).set(record));
    });

    it('still accepts the legacy shape (rating, prediction, responseTime, timestamp, uid)', async () => {
        await assertSucceeds(anonymousDb(env, 'alice').ref(path()).set(legacyRating('alice')));
    });

    it('treats responseTime as optional', async () => {
        const record = legacyRating('alice');
        delete record.responseTime;
        await assertSucceeds(anonymousDb(env, 'alice').ref(path()).set(record));
    });

    it('rejects unauthenticated writes', async () => {
        await assertFails(guestDb(env).ref(path()).set(legacyRating('alice')));
    });

    it("rejects writes into another participant's session", async () => {
        await assertFails(anonymousDb(env, 'mallory').ref(path()).set(legacyRating('mallory')));
    });

    it('rejects a record whose uid is not the writer', async () => {
        await assertFails(anonymousDb(env, 'alice').ref(path()).set(legacyRating('bob')));
    });

    it('rejects writes without a /sessions record', async () => {
        const db = anonymousDb(env, 'alice');
        await assertFails(db.ref(path('STUDY-1', OTHER_SESSION_ID)).set(legacyRating('alice')));
    });

    it('is create-only: no overwrite, partial update or delete by the owner', async () => {
        await seed(env, path(), {
            rating: 3,
            prediction: 3,
            timestamp: 1771628512647,
            uid: 'alice',
        });
        const db = anonymousDb(env, 'alice');
        await assertFails(db.ref(path()).set(legacyRating('alice')));
        await assertFails(db.ref(`${path()}/rating`).set(7));
        await assertFails(db.ref(path()).remove());
    });

    it('stops an attacker from pre-planting ratings in a session they do not own', async () => {
        await seedSession(env, 'alice', OTHER_SESSION_ID);
        const db = anonymousDb(env, 'mallory');
        await assertFails(db.ref(path('STUDY-2', OTHER_SESSION_ID)).set(legacyRating('mallory')));
    });

    it('requires a server timestamp', async () => {
        const record = legacyRating('alice', { timestamp: Date.now() });
        await assertFails(anonymousDb(env, 'alice').ref(path()).set(record));
    });

    it.each(['rating', 'prediction', 'timestamp', 'uid'])('requires %s', async (field) => {
        const record = legacyRating('alice');
        delete record[field];
        await assertFails(anonymousDb(env, 'alice').ref(path()).set(record));
    });

    it.each([
        ['rating', 0],
        ['rating', 8],
        ['rating', 4.5],
        ['rating', '5'],
        ['prediction', 0],
        ['prediction', 8],
        ['prediction', 2.5],
        ['prediction', true],
        ['responseTime', -1],
        ['responseTime', '100'],
        ['contentVersion', 0],
        ['contentVersion', 1.5],
        ['feedbackShown', 'yes'],
        ['target', 0.99],
        ['target', 7.01],
        ['target', '4'],
        ['score', -1],
        ['score', 101],
        ['score', 50.5],
        ['trial', 0],
        ['trial', 49],
        ['trial', 1.5],
        ['locale', '<b>en</b>'],
        ['room', 'lower-case'],
    ])('rejects %s = %j', async (field, value) => {
        const record = ratingRecord('alice', { [field]: value });
        await assertFails(anonymousDb(env, 'alice').ref(path()).set(record));
    });

    it('rejects unknown fields', async () => {
        const record = legacyRating('alice', { comment: 'x'.repeat(10_000) });
        await assertFails(anonymousDb(env, 'alice').ref(path()).set(record));
    });

    it.each(['STUDY-1', 'STUDY-9', 'STUDY-10', 'STUDY-48', 'STUDY-99'])(
        'accepts the study id %s',
        async (studyId) => {
            await assertSucceeds(
                anonymousDb(env, 'alice').ref(path(studyId)).set(legacyRating('alice'))
            );
        }
    );

    it.each(['STUDY-0', 'STUDY-01', 'STUDY-100', 'study-1', 'paper1', 'junk'])(
        'rejects the study id %s',
        async (studyId) => {
            await assertFails(
                anonymousDb(env, 'alice').ref(path(studyId)).set(legacyRating('alice'))
            );
        }
    );

    it('rejects writes to a whole study node by participants', async () => {
        const db = anonymousDb(env, 'alice');
        await assertFails(db.ref('ratings/STUDY-1').set({ [SESSION_ID]: legacyRating('alice') }));
    });
});
