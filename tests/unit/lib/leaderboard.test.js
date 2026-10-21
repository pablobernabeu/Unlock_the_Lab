import { describe, expect, it } from 'vitest';
import {
    findEntriesByUsername,
    findRank,
    normaliseEntries,
    rankEntries,
} from '../../../src/lib/leaderboard.js';

/** The public v1 backup of /leaderboard (data/leaderboard.json, October 2026). */
// prettier-ignore
const V1_BACKUP = {
    session_1771630835301_gj69lmk1o: { papersRated: 12, score: 1044, timestamp: 1771632076449, userName: 'Red Bear 76' },
    session_1771634502453_iienlw3th: { papersRated: 12, score: 1152, timestamp: 1771635019328, userName: 'Green Dolphin 30' },
    session_1771677565473_cl1qc7d4c: { papersRated: 12, score: 1129, timestamp: 1771683192348, userName: 'Tall Rabbit 07' },
    session_1771678384738_qmprz24pf: { papersRated: 0, score: 0, timestamp: 1771678460640, userName: 'Mighty Falcon 92' },
    session_1772371401905_tajc9odyd: { papersRated: 1, score: 53, timestamp: 1772371433708, uid: 'KJMjuoQruGS36WJWM4avcpcPh5b2', userName: '' },
    session_1773148204715_4vcf7o9jh: { papersRated: 1, score: 88, timestamp: 1773148246547, uid: 'YzO3H9B6RcVz8dBaKjmOUJ2IPEr2', userName: 'Curious Penguin 83' },
    session_1790362780158_vajs8e9ta: { papersRated: 4, score: 352, timestamp: 1790363617487, uid: '3ueQk9YP59bTquh1oKJSCY5oXH93', userName: 'Curious Hawk 71' },
};

let counter = 0;
function entry(overrides) {
    counter += 1;
    return {
        sessionId: `session_${1771000000000 + counter}_e${counter}`,
        userName: `Red Fox ${String(counter).padStart(2, '0')}`,
        nameValid: true,
        score: 0,
        papersRated: 0,
        meanAccuracy: null,
        displayedAccuracy: null,
        timestamp: 1771000000000 + counter,
        uid: null,
        room: null,
        ...overrides,
    };
}

function scored(score, papersRated, overrides = {}) {
    return entry({
        score,
        papersRated,
        meanAccuracy: score / papersRated,
        displayedAccuracy: Math.round(score / papersRated),
        ...overrides,
    });
}

describe('normaliseEntries', () => {
    it('keeps legacy entries and flags empty or missing names', () => {
        const entries = normaliseEntries(V1_BACKUP);
        expect(entries).toHaveLength(7);
        const unnamed = entries.find(
            ({ sessionId }) => sessionId === 'session_1772371401905_tajc9odyd'
        );
        expect(unnamed).toMatchObject({
            userName: '',
            nameValid: false,
            score: 53,
            papersRated: 1,
        });
        const legacy = entries.find(({ userName }) => userName === 'Red Bear 76');
        expect(legacy).toMatchObject({
            uid: null,
            room: null,
            nameValid: true,
            displayedAccuracy: 87,
        });
        const nothingRated = entries.find(({ userName }) => userName === 'Mighty Falcon 92');
        expect(nothingRated.meanAccuracy).toBeNull();
    });

    it('drops values that cannot be genuine', () => {
        const entries = normaliseEntries({
            ok: { score: 100, papersRated: 1, timestamp: 1, userName: 'Wise Owl 01' },
            huge: { score: 1e9, papersRated: 1, timestamp: 1, userName: 'Wise Owl 02' },
            negative: { score: -5, papersRated: 1, timestamp: 1, userName: 'Wise Owl 03' },
            tooMany: { score: 100, papersRated: 49, timestamp: 1 },
            fractional: { score: 50, papersRated: 1.5, timestamp: 1 },
            text: { score: '100', papersRated: 1 },
            notAnObject: 'hello',
            nothing: null,
        });
        expect(entries.map(({ sessionId }) => sessionId)).toEqual(['ok']);
    });

    it('keeps entries without papersRated for counting but never ranks them', () => {
        const entries = normaliseEntries({
            early: { score: 450, timestamp: 1, userName: 'Wise Owl 04' },
        });
        expect(entries[0]).toMatchObject({
            papersRated: 0,
            meanAccuracy: null,
            displayedAccuracy: null,
        });
        expect(rankEntries(entries, { minStudies: 0 })[0].rank).toBeNull();
    });

    it('treats a missing papersRated as zero and keeps valid rooms only', () => {
        const [first, second] = normaliseEntries({
            a: { score: 0, timestamp: 5, room: 'OXFORD-1', userName: 'Kind Seal 11' },
            b: { score: 0, timestamp: 5, room: '<script>', userName: 'Anonymous' },
        });
        expect(first).toMatchObject({ papersRated: 0, room: 'OXFORD-1', nameValid: true });
        expect(second).toMatchObject({ room: null, nameValid: false });
    });

    it('handles empty input', () => {
        expect(normaliseEntries(null)).toEqual([]);
        expect(normaliseEntries(undefined)).toEqual([]);
    });
});

describe('rankEntries', () => {
    it('ranks the v1 backup by mean accuracy, ranking only entries with 10 or more studies', () => {
        const ranked = rankEntries(normaliseEntries(V1_BACKUP));
        expect(ranked.map(({ userName, rank }) => [userName, rank])).toEqual([
            ['Green Dolphin 30', 1],
            ['Tall Rabbit 07', 2],
            ['Red Bear 76', 3],
            ['Curious Hawk 71', null],
            ['Curious Penguin 83', null],
            ['', null],
            ['Mighty Falcon 92', null],
        ]);
    });

    it('orders by the displayed percentage, not by summed points', () => {
        const volume = scored(2880, 48); // 60%
        const accurate = scored(1140, 12); // 95%
        const ranked = rankEntries([volume, accurate]);
        expect(ranked.map(({ sessionId }) => sessionId)).toEqual([
            accurate.sessionId,
            volume.sessionId,
        ]);
    });

    it('gives tied entries the same rank (1, 2, 2, 4)', () => {
        const first = scored(950, 10);
        const tiedA = scored(1044, 12, { timestamp: 200 });
        const tiedB = scored(1045, 12, { timestamp: 100 }); // 87.08% and 87.0% both show as 87%
        const fourth = scored(800, 10);
        const ranked = rankEntries([fourth, tiedA, first, tiedB]);
        expect(ranked.map(({ rank }) => rank)).toEqual([1, 2, 2, 4]);
        // Within a tie, the earlier entry comes first.
        expect(ranked[1].sessionId).toBe(tiedB.sessionId);
    });

    it('breaks equal percentages by the number of rated studies (more points first)', () => {
        const fewer = scored(870, 10);
        const more = scored(1740, 20);
        const ranked = rankEntries([fewer, more]);
        expect(ranked.map(({ sessionId, rank }) => [sessionId, rank])).toEqual([
            [more.sessionId, 1],
            [fewer.sessionId, 2],
        ]);
    });

    it('lets a single perfect study rank only when the minimum allows it', () => {
        const lucky = scored(100, 1);
        const steady = scored(900, 10);
        expect(rankEntries([lucky, steady]).map(({ rank }) => rank)).toEqual([1, null]);
        expect(rankEntries([lucky, steady], { minStudies: 1 })[0].sessionId).toBe(lucky.sessionId);
    });

    it('filters by time and by room', () => {
        const old = scored(900, 10, { timestamp: 1000, room: 'ROOM-A' });
        const recent = scored(800, 10, { timestamp: 5000, room: 'ROOM-B' });
        const legacy = scored(700, 10, { timestamp: null });
        expect(
            rankEntries([old, recent, legacy], { since: 2000 }).map(({ sessionId }) => sessionId)
        ).toEqual([recent.sessionId]);
        expect(rankEntries([old, recent, legacy], { room: 'ROOM-A' })).toHaveLength(1);
        expect(rankEntries([old, recent, legacy], { room: null })).toHaveLength(3);
    });

    it('does not modify its input', () => {
        const entries = [scored(900, 10)];
        rankEntries(entries);
        expect(entries[0]).not.toHaveProperty('rank');
    });
});

describe('findRank', () => {
    it('reports the rank and the number of ranked entries', () => {
        const ranked = rankEntries(normaliseEntries(V1_BACKUP));
        expect(findRank(ranked, 'session_1771630835301_gj69lmk1o')).toMatchObject({
            rank: 3,
            rankedCount: 3,
        });
    });

    it('reports a null rank below the minimum and null for unknown sessions', () => {
        const ranked = rankEntries(normaliseEntries(V1_BACKUP));
        expect(findRank(ranked, 'session_1790362780158_vajs8e9ta')).toMatchObject({
            rank: null,
            rankedCount: 3,
        });
        expect(findRank(ranked, 'session_missing')).toBeNull();
        expect(findRank(undefined, 'x')).toBeNull();
    });
});

describe('findEntriesByUsername', () => {
    const entries = normaliseEntries({
        a: { score: 0, papersRated: 0, timestamp: 1, userName: 'Red Fox 07' },
        b: { score: 0, papersRated: 0, timestamp: 2, userName: 'Red Fox 07' },
        c: { score: 0, papersRated: 0, timestamp: 3, userName: 'Red Fox 70' },
    });

    it('matches whole names, ignoring case and spaces, newest first', () => {
        expect(
            findEntriesByUsername(entries, ' red  fox 07 ').map(({ sessionId }) => sessionId)
        ).toEqual(['b', 'a']);
        expect(findEntriesByUsername(entries, 'REDFOX70')).toHaveLength(1);
    });

    it('never returns partial matches', () => {
        expect(findEntriesByUsername(entries, 'Red')).toEqual([]);
        expect(findEntriesByUsername(entries, 'Red Fox 7')).toEqual([]);
        expect(findEntriesByUsername(entries, '')).toEqual([]);
    });
});
