import { beforeEach, describe, expect, it, vi } from 'vitest';
import { databaseModule, fake } from './fake-database.js';

vi.mock('firebase/database', () => import('./fake-database.js').then((m) => m.databaseModule));
vi.mock('../../../src/lib/firebase.js', () =>
    import('./fake-database.js').then((m) => m.firebaseModule)
);

const { createLeaderboardSync } = await import('../../../src/app/leaderboard-sync.js');

const SID = 'session_1800000000000_abc123';
const ENTRY = `leaderboard/${SID}`;

let local;

function createSync() {
    return createLeaderboardSync({ sessionId: SID, getLocal: () => local });
}

function totals(papersRated, score) {
    return { uid: 'uid-1', userName: 'Curious Otter 42', room: null, score, papersRated };
}

beforeEach(() => {
    fake.reset();
    vi.clearAllMocks();
    vi.spyOn(console, 'info').mockImplementation(() => {});
});

describe('createLeaderboardSync', () => {
    it('catches up one study at a time', async () => {
        local = totals(3, 240);
        await createSync().sync();
        expect(fake.writesTo('set', ENTRY).map(({ value }) => value.papersRated)).toEqual([
            1, 2, 3,
        ]);
        expect(fake.read(ENTRY)).toMatchObject({ papersRated: 3, score: 240 });
    });

    it('carries on after another tab of the session moved the entry ahead', async () => {
        local = totals(1, 80);
        const sync = createSync();
        await sync.sync();
        // Another tab saves two more studies; this tab's cached entry is now stale.
        fake.write(ENTRY, { ...totals(3, 240), timestamp: fake.now });
        local = totals(2, 160);
        fake.refuse('set', ENTRY);
        await sync.sync();
        expect(fake.read(ENTRY)).toMatchObject({ papersRated: 3 });

        // This tab is behind the entry: nothing to write yet.
        await sync.sync();
        expect(fake.read(ENTRY)).toMatchObject({ papersRated: 3 });

        // Its own totals overtake the entry.
        local = totals(5, 400);
        await sync.sync();
        expect(fake.read(ENTRY)).toMatchObject({ papersRated: 5, score: 400 });
    });

    it('plans each update from the entry as stored now, not as this page last wrote it', async () => {
        local = totals(1, 80);
        const sync = createSync();
        await sync.sync();
        // Another tab of the session saves a study; this tab then has both.
        fake.write(ENTRY, { ...totals(2, 170), timestamp: fake.now });
        local = totals(3, 250);
        await sync.sync();
        const sets = fake.writesTo('set', ENTRY).map(({ value }) => value.papersRated);
        expect(sets).toEqual([1, 3]);
        expect(fake.read(ENTRY)).toMatchObject({ papersRated: 3, score: 250 });
    });

    it('recovers within the same update when a write is refused', async () => {
        fake.write(ENTRY, { ...totals(2, 160), timestamp: fake.now });
        // This tab read the entry just before another tab's write landed.
        databaseModule.get.mockImplementationOnce(async () => ({
            exists: () => true,
            val: () => ({ ...totals(1, 80), timestamp: fake.now }),
        }));
        fake.refuse('set', ENTRY);
        local = totals(3, 240);
        await createSync().sync();
        expect(fake.read(ENTRY)).toMatchObject({ papersRated: 3, score: 240 });
    });

    it('catches up after a rating once the entry is no longer ahead', async () => {
        // Another tab has saved more than this one knows about.
        fake.write(ENTRY, { ...totals(4, 330), timestamp: fake.now });
        local = totals(3, 240);
        const sync = createSync();
        await sync.sync();
        expect(fake.writesTo('set', ENTRY)).toEqual([]);
        // The next rating takes this tab past the stored entry.
        local = totals(5, 420);
        await sync.sync();
        expect(fake.read(ENTRY)).toMatchObject({ papersRated: 5, score: 420 });
    });

    it('never updates an entry that belongs to another uid', async () => {
        fake.write(ENTRY, { ...totals(2, 160), uid: 'someone-else' });
        local = totals(4, 320);
        const sync = createSync();
        await sync.sync();
        local = totals(5, 400);
        await sync.sync();
        expect(fake.writes.filter(({ op }) => op === 'set')).toEqual([]);
    });
});
