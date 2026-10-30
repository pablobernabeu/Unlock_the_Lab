import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
    NOW,
    anonymousDb,
    createRulesEnv,
    leaderboardEntry,
    presenceRecord,
    rankingRecord,
    ratingRecord,
    seed,
    sessionRecord,
} from './helpers.js';

// v1 sessions have ratings, a leaderboard entry and sometimes rankings, but no /sessions
// record. A returning v1 participant creates that record on resume. The rules bind it to
// the uid v1 stored on the leaderboard entry or rankings, so nobody else can claim it first.

let env;

// Shapes and values from the production snapshot of 2026-10-21.
const V1_SESSION_ID = 'session_1773148204715_4vcf7o9jh';
const V1_UID = 'YzO3H9B6RcVz8dBaKjmOUJ2IPEr2';
const V1_ENTRY = {
    papersRated: 12,
    score: 1044,
    timestamp: 1773148246547,
    uid: V1_UID,
    userName: 'Curious Penguin 83',
};
const V1_RATING = { prediction: 3, rating: 2, responseTime: 23880, timestamp: 1773148246000 };

const owner = () => anonymousDb(env, V1_UID);
const attacker = () => anonymousDb(env, 'mallory');
const path = (node) => `${node}/${V1_SESSION_ID}`;

beforeAll(async () => {
    env = await createRulesEnv('legacy');
});

beforeEach(async () => {
    await env.clearDatabase();
    await seed(env, `ratings/STUDY-3/${V1_SESSION_ID}`, V1_RATING);
    await seed(env, `ratings/STUDY-17/${V1_SESSION_ID}`, { ...V1_RATING, uid: V1_UID });
});

afterAll(async () => {
    await env.cleanup();
});

describe('resuming a v1 session', () => {
    beforeEach(async () => {
        await seed(env, path('leaderboard'), V1_ENTRY);
    });

    it('lets the v1 participant create the /sessions record and carry on', async () => {
        const db = owner();
        await assertSucceeds(db.ref(path('sessions')).set(sessionRecord(V1_UID)));
        await assertSucceeds(db.ref(path('active')).set(presenceRecord(V1_UID)));
        await assertSucceeds(
            db.ref(`ratings/STUDY-21/${V1_SESSION_ID}`).set(ratingRecord(V1_UID, { trial: 13 }))
        );
        await assertSucceeds(
            db.ref(path('leaderboard')).update({ score: 1144, papersRated: 13, timestamp: NOW })
        );
        await assertSucceeds(db.ref(path('rankings')).set(rankingRecord(V1_UID)));
    });

    it('keeps the ratings v1 already stored create-only', async () => {
        await seed(env, path('sessions'), sessionRecord(V1_UID));
        await assertFails(
            owner().ref(`ratings/STUDY-3/${V1_SESSION_ID}`).set(ratingRecord(V1_UID))
        );
    });

    it('lets a v1 entry with an empty name be rewritten with a valid name', async () => {
        await seed(env, path('leaderboard'), { ...V1_ENTRY, userName: '' });
        await seed(env, path('sessions'), sessionRecord(V1_UID));
        const db = owner();
        await assertFails(
            db
                .ref(path('leaderboard'))
                .set(leaderboardEntry(V1_UID, { score: 1144, papersRated: 13, userName: '' }))
        );
        await assertSucceeds(
            db.ref(path('leaderboard')).set(
                leaderboardEntry(V1_UID, {
                    score: 1144,
                    papersRated: 13,
                    userName: 'Curious Penguin 83',
                })
            )
        );
    });

    it('stops another user claiming the session before the participant returns', async () => {
        await assertFails(attacker().ref(path('sessions')).set(sessionRecord('mallory')));
    });

    it('stops another user claiming a session whose rankings name the v1 uid', async () => {
        await seed(env, path('leaderboard'), null);
        await seed(env, path('rankings'), { ...rankingRecord(V1_UID), timestamp: 1773148300000 });
        await assertFails(attacker().ref(path('sessions')).set(sessionRecord('mallory')));
        await assertSucceeds(owner().ref(path('sessions')).set(sessionRecord(V1_UID)));
    });

    it('stops a session owner from taking over a leaderboard entry stored for another uid', async () => {
        await seed(env, path('sessions'), sessionRecord('mallory'));
        const takeover = leaderboardEntry('mallory', {
            score: 1144,
            papersRated: 13,
            userName: 'Wise Wolf 13',
        });
        await assertFails(attacker().ref(path('leaderboard')).set(takeover));
        await assertFails(
            attacker()
                .ref(`${path('leaderboard')}/userName`)
                .set('Wise Wolf 13')
        );
    });
});

describe('v1 sessions the rules cannot attribute', () => {
    it('lets a session with ratings but no leaderboard entry be created, then built up one study at a time', async () => {
        const db = owner();
        await assertSucceeds(db.ref(path('sessions')).set(sessionRecord(V1_UID)));
        await assertSucceeds(
            db.ref(path('leaderboard')).set(leaderboardEntry(V1_UID, { score: 90, papersRated: 1 }))
        );
        await assertSucceeds(
            db.ref(path('leaderboard')).update({ score: 170, papersRated: 2, timestamp: NOW })
        );
    });

    it('freezes a leaderboard entry stored without a uid, as v1 did', async () => {
        const entryWithoutUid = { ...V1_ENTRY };
        delete entryWithoutUid.uid;
        await seed(env, path('leaderboard'), entryWithoutUid);
        await assertSucceeds(owner().ref(path('sessions')).set(sessionRecord(V1_UID)));
        await assertFails(
            owner()
                .ref(path('leaderboard'))
                .set(leaderboardEntry(V1_UID, { score: 1144, papersRated: 13 }))
        );
    });
});
