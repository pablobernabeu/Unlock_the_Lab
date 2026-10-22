import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fake } from './fake-database.js';

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
