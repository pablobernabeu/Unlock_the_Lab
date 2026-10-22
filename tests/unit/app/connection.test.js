import { beforeEach, describe, expect, it, vi } from 'vitest';
import { databaseModule, fake, settle } from './fake-database.js';

vi.mock('firebase/database', () => import('./fake-database.js').then((m) => m.databaseModule));
vi.mock('firebase/auth', () => import('./fake-database.js').then((m) => m.authModule));
vi.mock('../../../src/lib/firebase.js', () =>
    import('./fake-database.js').then((m) => m.firebaseModule)
);

const { ConnectionError, createConnection, endedAfterJoin } =
    await import('../../../src/app/connection.js');

const SID = 'session_1800000000000_abc123';
const SESSION = `sessions/${SID}`;
const ACTIVE = `active/${SID}`;

function connect({ joinedAt = null } = {}) {
    const session = { joinedAt };
    const statuses = [];
    const connection = createConnection({
        sessionId: SID,
        room: null,
        getJoinedAt: () => session.joinedAt,
        setJoinedAt: (value) => {
            session.joinedAt = value;
        },
        onStatus: (status) => statuses.push(status),
    });
    return { connection, session, statuses };
}

beforeEach(() => {
    fake.reset();
    vi.clearAllMocks();
});

describe('endedAfterJoin', () => {
    it('is true only when the ending came after the join', () => {
        expect(endedAfterJoin(200, 100)).toBe(true);
        expect(endedAfterJoin(100, 100)).toBe(false);
        expect(endedAfterJoin(50, 100)).toBe(false);
        expect(endedAfterJoin(null, 100)).toBe(false);
        expect(endedAfterJoin(200, null)).toBe(false);
    });
});

describe('createConnection: the session record', () => {
    it('creates the record for a new session and saves the join time', async () => {
        const { connection, session } = connect();
        await expect(connection.whenReady()).resolves.toEqual({ uid: 'uid-1' });
        expect(fake.read(SESSION)).toMatchObject({ uid: 'uid-1', createdAt: fake.now });
        expect(session.joinedAt).toBeTypeOf('number');
    });

    it('creates the record for a resumed v1 session, which has no join time', async () => {
        fake.write(`leaderboard/${SID}`, { score: 80, papersRated: 1 });
        const { connection } = connect();
        await connection.whenReady();
        expect(fake.writesTo('set', SESSION)).toHaveLength(1);
    });

    it('refuses a session whose record belongs to another uid', async () => {
        fake.write(SESSION, { uid: 'someone-else' });
        const { connection, statuses } = connect();
        await expect(connection.whenReady()).rejects.toMatchObject({ kind: 'claimed' });
        expect(statuses.at(-1)).toBe('claimed');
    });

    it('does not bring back a record that was deleted after the session joined', async () => {
        const { connection, statuses } = connect({ joinedAt: fake.now - 60_000 });
        const error = await connection.whenReady().catch((failure) => failure);
        expect(error).toBeInstanceOf(ConnectionError);
        expect(error.kind).toBe('closed');
        expect(statuses.at(-1)).toBe('closed');
        expect(fake.writesTo('set', SESSION)).toEqual([]);
        expect(fake.read(SESSION)).toBeNull();
        // Later writes are refused too, without trying again.
        await expect(connection.whenReady()).rejects.toMatchObject({ kind: 'closed' });
        expect(fake.writesTo('set', SESSION)).toEqual([]);
    });

    it('accepts its own record when a retried create is refused after a lost acknowledgement', async () => {
        // The first create landed but its acknowledgement was lost; the retry is refused.
        databaseModule.set.mockImplementationOnce((reference, value) => {
            fake.write(reference.path, value);
            const error = new Error('PERMISSION_DENIED: Permission denied');
            error.code = 'PERMISSION_DENIED';
            return Promise.reject(error);
        });
        const { connection, statuses } = connect();
        await expect(connection.whenReady()).resolves.toEqual({ uid: 'uid-1' });
        expect(statuses.at(-1)).toBe('ready');
    });

    it('still reports a claimed session when the refused create has no record behind it', async () => {
        fake.refuse('set', SESSION);
        const { connection } = connect();
        await expect(connection.whenReady()).rejects.toMatchObject({ kind: 'claimed' });
    });
});

describe('createConnection: pause and resume', () => {
    async function readyWithPresence() {
        const setup = connect();
        await setup.connection.whenReady();
        setup.connection.startPresence();
        await settle();
        expect(fake.read(ACTIVE)).toMatchObject({ uid: 'uid-1' });
        return setup;
    }

    it('removes presence and goes offline, then comes back on Continue', async () => {
        const { connection } = await readyWithPresence();
        await connection.pause();
        expect(fake.read(ACTIVE)).toBeNull();
        expect(databaseModule.goOffline).toHaveBeenCalledTimes(1);

        connection.resume();
        await settle();
        expect(databaseModule.goOnline).toHaveBeenCalledTimes(1);
        expect(fake.read(ACTIVE)).toMatchObject({ uid: 'uid-1' });
    });

    it('stays online when Continue comes while presence is still being removed', async () => {
        const { connection } = await readyWithPresence();
        const presenceWrites = fake.writesTo('set', ACTIVE).length;
        const releaseRemove = fake.hold('remove', ACTIVE);
        const pausing = connection.pause();
        await settle();

        connection.resume();
        await settle();
        releaseRemove();
        await pausing;
        await settle();

        expect(databaseModule.goOffline).not.toHaveBeenCalled();
        expect(fake.writesTo('set', ACTIVE).length).toBeGreaterThan(presenceWrites);
        // The server applies the removal before the new entry.
        expect(fake.read(ACTIVE)).toMatchObject({ uid: 'uid-1' });
    });
});
