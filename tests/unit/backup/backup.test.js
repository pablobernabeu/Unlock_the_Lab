// @vitest-environment node
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    DEFAULT_DATABASE_URL,
    INFO_FILE,
    compareKeys,
    countRecords,
    fetchNode,
    fileHasData,
    isEmptyValue,
    nodeUrl,
    parseOptions,
    planBackup,
    runBackup,
    serialise,
    sortKeysDeep,
} from '../../../scripts/backup.mjs';

const NOW = new Date('2026-10-21T03:17:00.000Z');

const RATINGS = {
    'STUDY-10': { session_1771670275087_oxteoczuc: { rating: 5, prediction: 4, timestamp: 2 } },
    'STUDY-2': {
        session_1771628092807_b59wcojpe: { timestamp: 1, rating: 1, prediction: 1 },
        session_1771677960149_8763zw081: { rating: 2, prediction: 1, timestamp: 3 },
    },
};
const LEADERBOARD = { session_1771630835301_gj69lmk1o: { userName: 'Red Bear 76', score: 1044 } };

function fetchedData(overrides = {}) {
    return {
        ratings: RATINGS,
        leaderboard: LEADERBOARD,
        rankings: null,
        sessions: {},
        ...overrides,
    };
}

function existingFiles(data) {
    return Object.fromEntries(
        Object.entries(data).map(([node, value]) => [`${node}.json`, serialise(value)])
    );
}

const silentLogger = { log: () => {}, warn: () => {}, error: () => {} };

function jsonResponse(body, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
    });
}

/** A fake fetch serving `data` by node name, as the REST API does for /<node>.json. */
function fakeFetch(data) {
    return vi.fn(async (url) => {
        const node = new URL(url).pathname.replace(/^\/|\.json$/g, '');
        return jsonResponse(data[node] ?? null);
    });
}

describe('compareKeys', () => {
    it('orders numbered keys naturally', () => {
        const keys = ['STUDY-10', 'STUDY-2', 'STUDY-1', 'STUDY-48', 'STUDY-9'];
        expect(keys.sort(compareKeys)).toEqual([
            'STUDY-1',
            'STUDY-2',
            'STUDY-9',
            'STUDY-10',
            'STUDY-48',
        ]);
    });

    it('orders session ids by their timestamp and then their suffix', () => {
        const keys = [
            'session_1771677960149_b',
            'session_999999999999_z',
            'session_1771677960149_a',
        ];
        expect(keys.sort(compareKeys)).toEqual([
            'session_999999999999_z',
            'session_1771677960149_a',
            'session_1771677960149_b',
        ]);
    });

    it('is a total order, breaking ties by code units', () => {
        expect(compareKeys('07', '7')).toBeLessThan(0);
        expect(compareKeys('7', '07')).toBeGreaterThan(0);
        expect(compareKeys('B', 'a')).toBeLessThan(0);
        expect(compareKeys('same', 'same')).toBe(0);
        expect(compareKeys('', 'a')).toBeLessThan(0);
    });

    it('copes with numbers longer than Number.MAX_SAFE_INTEGER', () => {
        expect(compareKeys('x99999999999999999999', 'x100000000000000000000')).toBeLessThan(0);
    });
});

describe('sortKeysDeep and serialise', () => {
    it('sorts keys at every depth without reordering arrays', () => {
        const sorted = sortKeysDeep({ b: { z: 1, a: [{ y: 1, x: 2 }, 3] }, a: null });
        expect(JSON.stringify(sorted)).toBe('{"a":null,"b":{"a":[{"x":2,"y":1},3],"z":1}}');
    });

    it('does not mutate its input', () => {
        const input = { b: 1, a: { d: 1, c: 2 } };
        sortKeysDeep(input);
        expect(Object.keys(input)).toEqual(['b', 'a']);
        expect(Object.keys(input.a)).toEqual(['d', 'c']);
    });

    it('gives identical text for the same data in any key order', () => {
        const reordered = {
            'STUDY-2': {
                session_1771677960149_8763zw081: { timestamp: 3, prediction: 1, rating: 2 },
                session_1771628092807_b59wcojpe: { prediction: 1, rating: 1, timestamp: 1 },
            },
            'STUDY-10': RATINGS['STUDY-10'],
        };
        expect(serialise(reordered)).toBe(serialise(RATINGS));
    });

    it('writes pretty JSON with a final newline', () => {
        expect(serialise({ b: 2, a: 1 })).toBe('{\n  "a": 1,\n  "b": 2\n}\n');
        expect(serialise(null)).toBe('null\n');
        expect(serialise(undefined)).toBe('null\n');
    });
});

describe('emptiness and counts', () => {
    it.each([
        [null, true],
        [undefined, true],
        [{}, true],
        [[], true],
        [{ a: 1 }, false],
        [0, false],
    ])('isEmptyValue(%j) is %s', (value, expected) => {
        expect(isEmptyValue(value)).toBe(expected);
    });

    it.each([
        [null, false],
        ['', false],
        ['null\n', false],
        ['{}\n', false],
        ['{"a":1}', true],
        ['not json', true],
    ])('fileHasData(%j) is %s', (text, expected) => {
        expect(fileHasData(text)).toBe(expected);
    });

    it('counts ratings across studies and other nodes by entry', () => {
        expect(countRecords('ratings', RATINGS)).toBe(3);
        expect(countRecords('leaderboard', LEADERBOARD)).toBe(1);
        expect(countRecords('rankings', null)).toBe(0);
        expect(countRecords('ratings', { 'STUDY-1': null })).toBe(0);
    });
});

describe('planBackup', () => {
    it('writes every node and the info file on the first run', () => {
        const plan = planBackup({ fetched: fetchedData(), now: NOW });
        expect(plan.changed).toEqual([
            'ratings.json',
            'leaderboard.json',
            'rankings.json',
            'sessions.json',
        ]);
        expect(plan.refused).toEqual([]);
        const info = JSON.parse(plan.writes.find((write) => write.file === INFO_FILE).text);
        expect(info).toEqual({
            counts: { leaderboard: 1, rankings: 0, ratings: 3, sessions: 0 },
            lastBackup: '2026-10-21T03:17:00.000Z',
        });
    });

    it('writes nothing, not even the info file, when the data is unchanged', () => {
        const data = fetchedData();
        const plan = planBackup({ fetched: data, existing: existingFiles(data), now: NOW });
        expect(plan.changed).toEqual([]);
        expect(plan.writes).toEqual([]);
    });

    it('writes only the changed node plus the info file', () => {
        const data = fetchedData();
        const leaderboard = { ...LEADERBOARD, session_1771634502453_iienlw3th: { score: 1 } };
        const plan = planBackup({
            fetched: { ...data, leaderboard },
            existing: existingFiles(data),
            now: NOW,
        });
        expect(plan.changed).toEqual(['leaderboard.json']);
        expect(plan.writes.map((write) => write.file)).toEqual(['leaderboard.json', INFO_FILE]);
    });

    it('refuses to replace a file holding data with an empty node', () => {
        const data = fetchedData();
        for (const empty of [null, {}]) {
            const plan = planBackup({
                fetched: { ...data, ratings: empty },
                existing: existingFiles(data),
            });
            expect(plan.refused).toEqual(['ratings']);
        }
    });

    it('allows that replacement with allowEmpty', () => {
        const data = fetchedData();
        const plan = planBackup({
            fetched: { ...data, ratings: null },
            existing: existingFiles(data),
            allowEmpty: true,
        });
        expect(plan.refused).toEqual([]);
        expect(plan.changed).toEqual(['ratings.json']);
    });

    it('does not treat an empty node over an empty or missing file as a loss', () => {
        const plan = planBackup({
            fetched: fetchedData({ rankings: null, sessions: null }),
            existing: { 'rankings.json': 'null\n' },
        });
        expect(plan.refused).toEqual([]);
        expect(plan.changed).toContain('sessions.json');
        expect(plan.changed).not.toContain('rankings.json');
    });
});

describe('nodeUrl', () => {
    it('appends the node to the production URL', () => {
        expect(nodeUrl(DEFAULT_DATABASE_URL, 'ratings').href).toBe(
            `${DEFAULT_DATABASE_URL}/ratings.json`
        );
        expect(nodeUrl(`${DEFAULT_DATABASE_URL}/`, 'ratings').href).toBe(
            `${DEFAULT_DATABASE_URL}/ratings.json`
        );
    });

    it('keeps the emulator namespace query', () => {
        const url = nodeUrl('http://127.0.0.1:9000/?ns=demo-unlock-the-lab', 'sessions');
        expect(url.href).toBe('http://127.0.0.1:9000/sessions.json?ns=demo-unlock-the-lab');
    });
});

describe('fetchNode', () => {
    const options = (fetchImpl) => ({
        fetchImpl,
        delays: [1, 1],
        sleep: async () => {},
        logger: silentLogger,
    });

    it('retries server errors and network failures, then succeeds', async () => {
        const fetchImpl = vi
            .fn()
            .mockResolvedValueOnce(new Response('busy', { status: 503 }))
            .mockRejectedValueOnce(new TypeError('fetch failed'))
            .mockResolvedValueOnce(jsonResponse({ a: 1 }));
        await expect(
            fetchNode(DEFAULT_DATABASE_URL, 'ratings', options(fetchImpl))
        ).resolves.toEqual({ a: 1 });
        expect(fetchImpl).toHaveBeenCalledTimes(3);
    });

    it('gives up after the last retry', async () => {
        const fetchImpl = vi.fn(async () => new Response('down', { status: 500 }));
        await expect(
            fetchNode(DEFAULT_DATABASE_URL, 'ratings', options(fetchImpl))
        ).rejects.toThrow('Could not read /ratings (attempt 3): HTTP 500: down');
        expect(fetchImpl).toHaveBeenCalledTimes(3);
    });

    it('does not retry a permission error', async () => {
        const fetchImpl = vi.fn(async () => jsonResponse({ error: 'Permission denied' }, 401));
        await expect(
            fetchNode(DEFAULT_DATABASE_URL, 'ratings', options(fetchImpl))
        ).rejects.toThrow(/HTTP 401: .*Permission denied/);
        expect(fetchImpl).toHaveBeenCalledTimes(1);
    });

    it('retries a truncated JSON body', async () => {
        const fetchImpl = vi
            .fn()
            .mockResolvedValueOnce(new Response('{"a":', { status: 200 }))
            .mockResolvedValueOnce(jsonResponse(null));
        await expect(
            fetchNode(DEFAULT_DATABASE_URL, 'ratings', options(fetchImpl))
        ).resolves.toBeNull();
    });
});

describe('parseOptions', () => {
    it('reads the supported flags', () => {
        expect(parseOptions(['--out', 'backup', '--dry-run'])).toEqual({
            outDir: 'backup',
            dryRun: true,
            allowEmpty: false,
            help: false,
        });
        expect(parseOptions(['--out=x', '--allow-empty']).allowEmpty).toBe(true);
    });

    it('rejects unknown flags and stray arguments', () => {
        expect(() => parseOptions(['--out', 'x', '--force'])).toThrow();
        expect(() => parseOptions(['x'])).toThrow();
    });
});

describe('runBackup', () => {
    let outDir;

    beforeEach(async () => {
        outDir = await mkdtemp(path.join(tmpdir(), 'utl-backup-'));
    });

    afterEach(async () => {
        await rm(outDir, { recursive: true, force: true });
    });

    const run = (data, extra = {}) =>
        runBackup({
            outDir,
            fetchImpl: fakeFetch(data),
            delays: [],
            now: NOW,
            logger: silentLogger,
            ...extra,
        });

    it('writes sorted files and the info file, then nothing on an unchanged rerun', async () => {
        expect(await run(fetchedData())).toBe(0);
        expect((await readdir(outDir)).sort()).toEqual([
            INFO_FILE,
            'leaderboard.json',
            'rankings.json',
            'ratings.json',
            'sessions.json',
        ]);
        const ratings = await readFile(path.join(outDir, 'ratings.json'), 'utf8');
        expect(ratings).toBe(serialise(RATINGS));
        expect(ratings.indexOf('STUDY-2')).toBeLessThan(ratings.indexOf('STUDY-10'));

        const info = await readFile(path.join(outDir, INFO_FILE), 'utf8');
        expect(await run(fetchedData(), { now: new Date('2026-10-22T03:17:00.000Z') })).toBe(0);
        expect(await readFile(path.join(outDir, INFO_FILE), 'utf8')).toBe(info);
    });

    it('writes nothing in a dry run', async () => {
        expect(await run(fetchedData(), { dryRun: true })).toBe(0);
        expect(await readdir(outDir)).toEqual([]);
    });

    it('exits with 1 and leaves every file untouched when a node comes back empty', async () => {
        await run(fetchedData());
        const before = await readFile(path.join(outDir, 'leaderboard.json'), 'utf8');
        const data = fetchedData({
            ratings: null,
            leaderboard: { ...LEADERBOARD, extra: { score: 1 } },
        });
        expect(await run(data)).toBe(1);
        expect(await readFile(path.join(outDir, 'leaderboard.json'), 'utf8')).toBe(before);
        expect(await readFile(path.join(outDir, 'ratings.json'), 'utf8')).toBe(serialise(RATINGS));
    });

    it('replaces the data when --allow-empty is given', async () => {
        await run(fetchedData());
        expect(await run(fetchedData({ ratings: null }), { allowEmpty: true })).toBe(0);
        expect(await readFile(path.join(outDir, 'ratings.json'), 'utf8')).toBe('null\n');
    });

    it('creates the output directory when needed', async () => {
        const nested = path.join(outDir, 'data');
        expect(await run(fetchedData(), { outDir: nested })).toBe(0);
        expect(await readdir(nested)).toContain('ratings.json');
    });

    it('rejects when the database cannot be read', async () => {
        const fetchImpl = vi.fn(async () => jsonResponse({ error: 'Permission denied' }, 401));
        await expect(run(fetchedData(), { fetchImpl })).rejects.toThrow(/Permission denied/);
        expect(await readdir(outDir)).toEqual([]);
    });
});
