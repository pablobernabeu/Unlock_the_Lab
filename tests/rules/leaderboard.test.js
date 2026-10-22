import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
    NOW,
    OTHER_SESSION_ID,
    SESSION_ID,
    anonymousDb,
    createRulesEnv,
    guestDb,
    leaderboardEntry,
    seed,
    seedSession,
} from './helpers.js';

let env;

beforeAll(async () => {
    env = await createRulesEnv('leaderboard');
});

beforeEach(async () => {
    await env.clearDatabase();
    await seedSession(env, 'alice');
});

afterAll(async () => {
    await env.cleanup();
});

const path = (sessionId = SESSION_ID) => `leaderboard/${sessionId}`;

async function seedEntry(score, papersRated) {
    await seed(env, path(), leaderboardEntry('alice', { score, papersRated }));
}

describe('/leaderboard', () => {
    it('is publicly readable', async () => {
        await assertSucceeds(guestDb(env).ref('leaderboard').get());
    });

    describe('creating an entry', () => {
        it('allows the first rated study', async () => {
            await assertSucceeds(
                anonymousDb(env, 'alice').ref(path()).set(leaderboardEntry('alice'))
            );
        });

        it('allows an empty entry and a room code', async () => {
            const entry = leaderboardEntry('alice', {
                score: 0,
                papersRated: 0,
                room: 'OSLO-2026',
            });
            await assertSucceeds(anonymousDb(env, 'alice').ref(path()).set(entry));
        });

        it('rejects more than one rated study', async () => {
            const entry = leaderboardEntry('alice', { score: 150, papersRated: 2 });
            await assertFails(anonymousDb(env, 'alice').ref(path()).set(entry));
        });

        it('rejects more than 100 points', async () => {
            const entry = leaderboardEntry('alice', { score: 101 });
            await assertFails(anonymousDb(env, 'alice').ref(path()).set(entry));
        });

        it('rejects points without a rated study', async () => {
            const entry = leaderboardEntry('alice', { score: 50, papersRated: 0 });
            await assertFails(anonymousDb(env, 'alice').ref(path()).set(entry));
        });

        it('rejects unauthenticated writes', async () => {
            await assertFails(guestDb(env).ref(path()).set(leaderboardEntry('alice')));
        });

        it("rejects writes to another participant's entry", async () => {
            await assertFails(
                anonymousDb(env, 'mallory').ref(path()).set(leaderboardEntry('mallory'))
            );
        });

        it('rejects an entry claimed for another uid', async () => {
            await assertFails(anonymousDb(env, 'alice').ref(path()).set(leaderboardEntry('bob')));
        });

        it('rejects writes without a /sessions record', async () => {
            const db = anonymousDb(env, 'alice');
            await assertFails(db.ref(path(OTHER_SESSION_ID)).set(leaderboardEntry('alice')));
        });
    });

    describe('updating an entry', () => {
        it('allows one more study and up to 100 more points', async () => {
            await seedEntry(1044, 12);
            const entry = leaderboardEntry('alice', { score: 1144, papersRated: 13 });
            await assertSucceeds(anonymousDb(env, 'alice').ref(path()).set(entry));
        });

        it('allows rewriting the same totals (for example after a reload)', async () => {
            await seedEntry(1044, 12);
            const entry = leaderboardEntry('alice', { score: 1044, papersRated: 12 });
            await assertSucceeds(anonymousDb(env, 'alice').ref(path()).set(entry));
        });

        it('allows a partial update of the changed fields', async () => {
            await seedEntry(88, 1);
            const update = { score: 170, papersRated: 2, timestamp: NOW };
            await assertSucceeds(anonymousDb(env, 'alice').ref(path()).update(update));
        });

        it('allows a resumed v1 entry with an empty name to gain a valid one', async () => {
            await seed(env, path(), {
                score: 53,
                papersRated: 1,
                timestamp: 1772371433708,
                uid: 'alice',
                userName: '',
            });
            const entry = leaderboardEntry('alice', { score: 53, papersRated: 1 });
            await assertSucceeds(anonymousDb(env, 'alice').ref(path()).set(entry));
        });

        it.each([
            ['papersRated decreases', 1044, 11],
            ['papersRated jumps by two', 1144, 14],
            ['score decreases', 1000, 13],
            ['score rises by more than 100', 1145, 13],
        ])('rejects an update where %s', async (_label, score, papersRated) => {
            await seedEntry(1044, 12);
            const entry = leaderboardEntry('alice', { score, papersRated });
            await assertFails(anonymousDb(env, 'alice').ref(path()).set(entry));
        });

        it('rejects a score above 100 points per rated study', async () => {
            await seedEntry(100, 1);
            const entry = leaderboardEntry('alice', { score: 200, papersRated: 1 });
            await assertFails(anonymousDb(env, 'alice').ref(path()).set(entry));
        });

        it('rejects more than 48 rated studies', async () => {
            await seedEntry(4700, 48);
            const entry = leaderboardEntry('alice', { score: 4700, papersRated: 49 });
            await assertFails(anonymousDb(env, 'alice').ref(path()).set(entry));
        });

        it('does not let the owner delete the entry', async () => {
            await seedEntry(88, 1);
            await assertFails(anonymousDb(env, 'alice').ref(path()).remove());
        });

        it("rejects another participant's update", async () => {
            await seedEntry(88, 1);
            const entry = leaderboardEntry('mallory', { score: 188, papersRated: 2 });
            await assertFails(anonymousDb(env, 'mallory').ref(path()).set(entry));
        });
    });

    describe('fields', () => {
        it('requires a server timestamp', async () => {
            const entry = leaderboardEntry('alice', { timestamp: Date.now() });
            await assertFails(anonymousDb(env, 'alice').ref(path()).set(entry));
        });

        it.each(['score', 'papersRated', 'timestamp', 'uid', 'userName'])(
            'requires %s',
            async (field) => {
                const entry = leaderboardEntry('alice');
                delete entry[field];
                await assertFails(anonymousDb(env, 'alice').ref(path()).set(entry));
            }
        );

        it.each([
            ['score', 87.5],
            ['score', '88'],
            ['papersRated', 0.5],
            ['papersRated', -1],
        ])('rejects %s = %j', async (field, value) => {
            const entry = leaderboardEntry('alice', { [field]: value });
            await assertFails(anonymousDb(env, 'alice').ref(path()).set(entry));
        });

        it.each(['Red Bear 76', 'Curious Penguin 83', 'Red Bear 76-1', 'Red Bear 76-123'])(
            'accepts the user name %j',
            async (userName) => {
                const entry = leaderboardEntry('alice', { userName });
                await assertSucceeds(anonymousDb(env, 'alice').ref(path()).set(entry));
            }
        );

        it.each([
            '<img src=x onerror=alert(1)>',
            '<script>alert(1)</script>',
            'Red Bear 76<b>',
            '',
            'red bear 76',
            'Red Bear 7',
            'Red Bear 760',
            'Red Bear 76-1234',
            'Red  Bear 76',
            'Red Bear',
            'Red Bear 76 ',
            `R${'e'.repeat(5000)}d Bear 76`,
        ])('rejects the user name %j', async (userName) => {
            const entry = leaderboardEntry('alice', { userName });
            await assertFails(anonymousDb(env, 'alice').ref(path()).set(entry));
        });

        it.each(['x', '-ROOM', 'room', 'ROOM NAME', 'A'.repeat(21)])(
            'rejects the room %j',
            async (room) => {
                const entry = leaderboardEntry('alice', { room });
                await assertFails(anonymousDb(env, 'alice').ref(path()).set(entry));
            }
        );

        it('rejects unknown fields', async () => {
            const entry = leaderboardEntry('alice', { avatar: 'x'.repeat(10_000) });
            await assertFails(anonymousDb(env, 'alice').ref(path()).set(entry));
        });
    });
});
