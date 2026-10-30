import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fake } from './fake-database.js';

vi.mock('firebase/database', () => import('./fake-database.js').then((m) => m.databaseModule));
vi.mock('../../../src/lib/firebase.js', () =>
    import('./fake-database.js').then((m) => m.firebaseModule)
);

const { submitRanking } = await import('../../../src/app/ranking-submit.js');

const SID = 'session_1800000000000_abc123';
const RANKING = `rankings/${SID}`;
const FIRST = { title: 20, access: 0, source: 0, theory: 0, methods: 0, conclusion: 0 };
const SECOND = { title: 10, access: 0, source: 0, theory: 0, methods: 10, conclusion: 0 };

function submit(tokens, uid = 'uid-1') {
    return submitRanking({ sessionId: SID, uid, userName: 'Curious Otter 42', room: 'R1', tokens });
}

beforeEach(() => {
    fake.reset();
    vi.clearAllMocks();
});

describe('submitRanking', () => {
    it('writes the allocation with the nickname, room and uid', async () => {
        await expect(submit(FIRST)).resolves.toEqual({ status: 'saved', tokens: FIRST });
        expect(fake.read(RANKING)).toEqual({
            ...FIRST,
            userName: 'Curious Otter 42',
            room: 'R1',
            uid: 'uid-1',
            timestamp: fake.now,
        });
    });

    it('returns the stored allocation when an earlier attempt landed after timing out', async () => {
        await submit(FIRST);
        // The participant changed the allocation and tried again; the create-only rule refuses it.
        fake.refuse('set', RANKING);
        await expect(submit(SECOND)).resolves.toEqual({ status: 'kept', tokens: FIRST });
    });

    it('keeps the new allocation when version 1 stored one without a uid', async () => {
        const v1Record = { ...FIRST, userName: 'Curious Otter 42', timestamp: 1_700_000_000_000 };
        fake.write(RANKING, v1Record);
        fake.refuse('set', RANKING);
        await expect(submit(SECOND)).resolves.toEqual({ status: 'earlier', tokens: SECOND });
        expect(fake.read(RANKING)).toEqual(v1Record);
    });

    it('keeps the new allocation when another uid stored one', async () => {
        fake.write(RANKING, { ...FIRST, uid: 'someone-else' });
        fake.refuse('set', RANKING);
        await expect(submit(SECOND)).resolves.toEqual({ status: 'earlier', tokens: SECOND });
    });

    it('fails when the write is refused and nothing is stored', async () => {
        fake.refuse('set', RANKING);
        await expect(submit(SECOND)).rejects.toThrow(/PERMISSION_DENIED/);
    });
});
