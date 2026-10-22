// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fake, settle } from './fake-database.js';

vi.mock('firebase/database', () => import('./fake-database.js').then((m) => m.databaseModule));
vi.mock('firebase/auth', () => import('./fake-database.js').then((m) => m.authModule));
vi.mock('../../../src/lib/firebase.js', () =>
    import('./fake-database.js').then((m) => m.firebaseModule)
);

const { createSession } = await import('../../../src/app/session.js');
const { createState } = await import('../../../src/app/state.js');

const SID = 'session_1800000000000_abc123';
const NAME = 'Curious Otter 42';

let state;
let events;
let session;

function rated(count, points = 80) {
    const ids = Array.from({ length: count }, (_, index) => `STUDY-${index + 1}`);
    return {
        userRatings: Object.fromEntries(ids.map((id) => [id, 4])),
        paperScores: Object.fromEntries(ids.map((id) => [id, points])),
        totalScore: count * points,
    };
}

function startSession(changes = {}) {
    state = { ...createState({ sessionId: SID, userName: NAME }), currentPage: 3, ...changes };
    events = { problems: [], closed: 0 };
    session = createSession({
        getState: () => state,
        patch: (next) => {
            state = { ...state, ...next };
        },
        onProblem: (kind) => events.problems.push(kind),
        onConnected: () => {},
        onClosed: () => {
            events.closed += 1;
        },
        onWarning: () => {},
        onPaused: () => {},
        onUserName: () => {},
    });
    return session;
}

beforeEach(() => {
    fake.reset();
    vi.clearAllMocks();
});

afterEach(async () => {
    await session?.end();
});

describe('createSession', () => {
    it('starts a session and brings the leaderboard up to date', async () => {
        await startSession(rated(2)).start();
        await settle();
        expect(session.closed).toBe(false);
        expect(fake.read(`leaderboard/${SID}`)).toMatchObject({ papersRated: 2, score: 160 });
        expect(fake.read(`active/${SID}`)).toMatchObject({ uid: 'uid-1' });
    });

    it('closes, writing nothing, when the session was deleted after it joined', async () => {
        await startSession({ ...rated(4), joinedAt: fake.now - 60_000 }).start();
        await settle();
        expect(session.closed).toBe(true);
        expect(events.closed).toBe(1);
        expect(events.problems).toEqual([]);
        expect(fake.writes).toEqual([]);
        await expect(session.whenReady()).rejects.toMatchObject({ kind: 'closed' });
    });

    it('closes when a write finds the session deleted after a failed start', async () => {
        startSession({ ...rated(4), joinedAt: fake.now - 60_000 });
        await expect(session.whenReady()).rejects.toMatchObject({ kind: 'closed' });
        expect(session.closed).toBe(true);
        expect(events.closed).toBe(1);
    });

    it('still counts saved answers when the facilitator has ended the session', async () => {
        fake.write('control/sessionsEndedAt', fake.now);
        fake.write(`sessions/${SID}`, { uid: 'uid-1' });
        await startSession({ ...rated(11), joinedAt: fake.now - 60_000 }).start();
        await settle();
        expect(session.closed).toBe(true);
        expect(events.closed).toBe(1);
        expect(fake.read(`leaderboard/${SID}`)).toMatchObject({ papersRated: 11, score: 880 });
        expect(fake.read(`active/${SID}`)).toBeNull();
    });

    it('syncs a rating that lands after the session was closed', async () => {
        await startSession(rated(10)).start();
        await settle();
        fake.write('control/sessionsEndedAt', fake.now + 1000);
        await settle();
        expect(session.closed).toBe(true);

        state = { ...state, ...rated(11) };
        await session.syncLeaderboard();
        expect(fake.read(`leaderboard/${SID}`)).toMatchObject({ papersRated: 11, score: 880 });
    });
});
