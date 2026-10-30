import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fake } from './fake-database.js';

vi.mock('firebase/database', () => import('./fake-database.js').then((m) => m.databaseModule));
vi.mock('../../../src/lib/firebase.js', () =>
    import('./fake-database.js').then((m) => m.firebaseModule)
);

const { loadOthersMeans } = await import('../../../src/app/results-data.js');

const SID = 'session_1800000000000_abc123';

beforeEach(() => {
    fake.reset();
});

describe('loadOthersMeans', () => {
    it("counts the others' ratings of the version of the participant's stored rating", async () => {
        fake.write('ratings/STUDY-13', {
            [SID]: { rating: 5, contentVersion: 2 },
            a: { rating: 4, contentVersion: 2 },
            b: { rating: 2, contentVersion: 3 },
        });
        const rows = [{ study: { id: 'STUDY-13' }, contentVersion: 3 }];
        expect(await loadOthersMeans(rows, SID)).toEqual({ 'STUDY-13': { n: 1, mean: 4 } });
    });

    it("falls back to the row's version when the rating is not stored", async () => {
        fake.write('ratings/STUDY-13', {
            a: { rating: 4, contentVersion: 2 },
            b: { rating: 2, contentVersion: 3 },
        });
        const rows = [{ study: { id: 'STUDY-13' }, contentVersion: 3 }];
        expect(await loadOthersMeans(rows, SID)).toEqual({ 'STUDY-13': { n: 1, mean: 2 } });
    });
});
