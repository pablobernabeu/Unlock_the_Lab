// @vitest-environment node
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    APP_CHECK_APP,
    APP_CHECK_ENDPOINT,
    DEFAULT_DATABASE_URL,
    INFO_FILE,
    SITE_URL,
    compareKeys,
    countRecords,
    exchangeDebugToken,
    fetchNode,
    fileHasData,
    isEmptyValue,
    nodeUrl,
    parseOptions,
    planBackup,
    reservedKeyPaths,
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

describe('reservedKeyPaths', () => {
    const record = { rating: 7, prediction: 7, timestamp: 1, uid: 'x' };

    it('finds keys named hasOwnProperty at any depth', () => {
        const ratings = {
            'STUDY-5': {
                hasOwnProperty: record,
                session_1771630835301_gj69lmk1o: { ...record, hasOwnProperty: 1 },
            },
        };
        expect(reservedKeyPaths('ratings', ratings)).toEqual([
            '/ratings/STUDY-5/hasOwnProperty',
            '/ratings/STUDY-5/session_1771630835301_gj69lmk1o/hasOwnProperty',
        ]);
        expect(reservedKeyPaths('leaderboard', { hasOwnProperty: { score: 1 } })).toEqual([
            '/leaderboard/hasOwnProperty',
        ]);
    });

    it('finds nothing in ordinary data, empty nodes or other Object method names', () => {
        expect(reservedKeyPaths('ratings', RATINGS)).toEqual([]);
        expect(reservedKeyPaths('rankings', null)).toEqual([]);
        expect(reservedKeyPaths('sessions', { toString: {}, constructor: {} })).toEqual([]);
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

    it('warns about each key the web SDK cannot read, and still backs it up', async () => {
        const logger = { ...silentLogger, log: vi.fn() };
        const ratings = { ...RATINGS, 'STUDY-5': { hasOwnProperty: { rating: 7 } } };
        expect(await run(fetchedData({ ratings }), { logger })).toBe(0);
        const warnings = logger.log.mock.calls
            .flat()
            .filter((line) => line.startsWith('::warning::'));
        expect(warnings).toEqual([
            '::warning::/ratings/STUDY-5/hasOwnProperty stops the web app from reading its node. ' +
                'Remove it as docs/deployment.md explains.',
        ]);
        const saved = JSON.parse(await readFile(path.join(outDir, 'ratings.json'), 'utf8'));
        expect(saved['STUDY-5']).toEqual({ hasOwnProperty: { rating: 7 } });
    });

    it('backs up the other nodes and warns when one node is refused', async () => {
        const log = vi.fn();
        const fetchImpl = vi.fn(async (url) => {
            const node = new URL(url).pathname.replace(/^\/|\.json$/g, '');
            if (node === 'sessions') return jsonResponse({ error: 'Permission denied' }, 401);
            return jsonResponse(fetchedData()[node] ?? null);
        });
        expect(await run(fetchedData(), { fetchImpl, logger: { ...silentLogger, log } })).toBe(0);
        expect((await readdir(outDir)).sort()).toEqual([
            INFO_FILE,
            'leaderboard.json',
            'rankings.json',
            'ratings.json',
        ]);
        const info = JSON.parse(await readFile(path.join(outDir, INFO_FILE), 'utf8'));
        expect(info.counts.sessions).toBeNull();
        expect(log.mock.calls.flat().join('\n')).toMatch(
            /::warning::Reading \/sessions was refused/
        );
    });

    it('keeps an earlier backup of a node that is refused later', async () => {
        await run(fetchedData());
        const before = await readFile(path.join(outDir, 'sessions.json'), 'utf8');
        const fetchImpl = vi.fn(async (url) => {
            const node = new URL(url).pathname.replace(/^\/|\.json$/g, '');
            if (node === 'sessions') return jsonResponse({ error: 'Permission denied' }, 401);
            return jsonResponse(fetchedData()[node] ?? null);
        });
        expect(await run(fetchedData(), { fetchImpl })).toBe(0);
        expect(await readFile(path.join(outDir, 'sessions.json'), 'utf8')).toBe(before);
    });

    it('rejects when the database cannot be read', async () => {
        const fetchImpl = vi.fn(async () => jsonResponse({ error: 'Permission denied' }, 401));
        await expect(run(fetchedData(), { fetchImpl })).rejects.toThrow(/Permission denied/);
        expect(await readdir(outDir)).toEqual([]);
    });
});

const EXCHANGE_URL =
    'https://content-firebaseappcheck.googleapis.com/v1/projects/unlock-the-lab-workshop/apps/' +
    '1:604889899913:web:d46afe88111e8bcb7d3758:exchangeDebugToken' +
    '?key=AIzaSyCjLzq8QNQqhGOpTJy3tzwuQrovMm6Vdi4';

/** Like fakeFetch, but also answers the App Check exchange with `token`. */
function fakeFetchWithAppCheck(data, token = 'app-check-token') {
    return vi.fn(async (url, init) => {
        if (String(url).startsWith(APP_CHECK_ENDPOINT))
            return jsonResponse({ token, ttl: '3600s' });
        const node = new URL(url).pathname.replace(/^\/|\.json$/g, '');
        return jsonResponse(
            init.headers['x-firebase-appcheck'] === token ? (data[node] ?? null) : 0
        );
    });
}

describe('the App Check web app', () => {
    it('is the public web app of src/lib/firebase-config.js and the live site', async () => {
        vi.resetModules();
        for (const name of ['PROJECT_ID', 'APP_ID', 'API_KEY'])
            vi.stubEnv(`VITE_FIREBASE_${name}`, '');
        const { firebaseConfig } = await import('../../../src/lib/firebase-config.js');
        expect(APP_CHECK_APP).toEqual({
            projectId: firebaseConfig.projectId,
            appId: firebaseConfig.appId,
            apiKey: firebaseConfig.apiKey,
        });
        const { homepage } = JSON.parse(
            await readFile(new URL('../../../package.json', import.meta.url), 'utf8')
        );
        expect(SITE_URL).toBe(`${homepage}/`);
    });
});

describe('exchangeDebugToken', () => {
    it('uses the endpoint and method of the installed web SDK', async () => {
        const { createRequire } = await import('node:module');
        const sdk = await readFile(
            createRequire(import.meta.url).resolve('@firebase/app-check'),
            'utf8'
        );
        expect(sdk).toContain(`const BASE_ENDPOINT = '${APP_CHECK_ENDPOINT}'`);
        expect(sdk).toContain("const EXCHANGE_DEBUG_TOKEN_METHOD = 'exchangeDebugToken'");
        expect(sdk).toMatch(/debug_token: debugToken/);
    });

    const options = (fetchImpl) => ({
        fetchImpl,
        delays: [1, 1],
        sleep: async () => {},
        logger: silentLogger,
    });

    it('makes the request the web SDK makes in debug mode', async () => {
        const fetchImpl = vi.fn(async () =>
            jsonResponse({ token: 'app-check-token', ttl: '3600s' })
        );
        await expect(exchangeDebugToken('debug-token', options(fetchImpl))).resolves.toBe(
            'app-check-token'
        );
        expect(fetchImpl).toHaveBeenCalledTimes(1);
        const [url, init] = fetchImpl.mock.calls[0];
        expect(url).toBe(EXCHANGE_URL);
        expect(init.method).toBe('POST');
        expect(init.headers).toEqual({
            'content-type': 'application/json',
            referer: 'https://unlock-the-lab.web.app/',
        });
        expect(JSON.parse(init.body)).toEqual({ debug_token: 'debug-token' });
    });

    it('retries server errors and network failures', async () => {
        const fetchImpl = vi
            .fn()
            .mockResolvedValueOnce(new Response('busy', { status: 503 }))
            .mockRejectedValueOnce(new TypeError('fetch failed'))
            .mockResolvedValueOnce(jsonResponse({ token: 'app-check-token', ttl: '3600s' }));
        await expect(exchangeDebugToken('debug-token', options(fetchImpl))).resolves.toBe(
            'app-check-token'
        );
        expect(fetchImpl).toHaveBeenCalledTimes(3);
    });

    it('fails at once on a refused token, saying what to check, without the token', async () => {
        const fetchImpl = vi.fn(async () =>
            jsonResponse({ error: { code: 403, status: 'PERMISSION_DENIED' } }, 403)
        );
        const failure = exchangeDebugToken('secret-debug-token', options(fetchImpl));
        await expect(failure).rejects.toThrow(
            /^Could not get an App Check token \(attempt 1\): HTTP 403: .*PERMISSION_DENIED.*registered as a debug token/
        );
        await failure.catch((error) => expect(error.message).not.toContain('secret-debug-token'));
        expect(fetchImpl).toHaveBeenCalledTimes(1);
    });

    it('rejects a response without a token', async () => {
        const fetchImpl = vi.fn(async () => jsonResponse({ ttl: '3600s' }));
        await expect(exchangeDebugToken('debug-token', options(fetchImpl))).rejects.toThrow(
            /attempt 3\): the response held no token/
        );
    });
});

describe('fetchNode with App Check', () => {
    it('sends the App Check token in the X-Firebase-AppCheck header', async () => {
        const fetchImpl = vi.fn(async () => jsonResponse({ a: 1 }));
        await fetchNode(DEFAULT_DATABASE_URL, 'ratings', {
            fetchImpl,
            appCheckToken: 'app-check-token',
        });
        expect(fetchImpl.mock.calls[0][1].headers).toEqual({
            accept: 'application/json',
            'x-firebase-appcheck': 'app-check-token',
        });
    });

    it('sends only the accept header without one', async () => {
        const fetchImpl = vi.fn(async () => jsonResponse({ a: 1 }));
        await fetchNode(DEFAULT_DATABASE_URL, 'ratings', { fetchImpl });
        expect(fetchImpl.mock.calls[0][1].headers).toEqual({ accept: 'application/json' });
    });
});

describe('runBackup with App Check', () => {
    let outDir;

    beforeEach(async () => {
        outDir = await mkdtemp(path.join(tmpdir(), 'utl-backup-'));
    });

    afterEach(async () => {
        await rm(outDir, { recursive: true, force: true });
    });

    const run = (extra) =>
        runBackup({ outDir, delays: [], now: NOW, logger: silentLogger, ...extra });

    it('exchanges the debug token once and sends the App Check token with every read', async () => {
        const fetchImpl = fakeFetchWithAppCheck(fetchedData());
        const log = vi.fn();
        expect(
            await run({
                fetchImpl,
                appCheckDebugToken: 'debug-token',
                logger: { ...silentLogger, log },
            })
        ).toBe(0);
        const urls = fetchImpl.mock.calls.map(([url]) => String(url));
        expect(urls[0]).toBe(EXCHANGE_URL);
        expect(urls.slice(1)).toEqual(
            ['ratings', 'leaderboard', 'rankings', 'sessions'].map(
                (node) => `${DEFAULT_DATABASE_URL}/${node}.json`
            )
        );
        expect(await readFile(path.join(outDir, 'ratings.json'), 'utf8')).toBe(serialise(RATINGS));
        const lines = log.mock.calls.flat().join('\n');
        expect(lines).toContain('Sending an App Check token from FIREBASE_APPCHECK_DEBUG_TOKEN.');
        expect(lines).not.toContain('app-check-token');
        expect(lines).not.toContain('debug-token');
    });

    it('reads exactly as before without a debug token', async () => {
        const fetchImpl = fakeFetch(fetchedData());
        expect(await run({ fetchImpl })).toBe(0);
        expect(fetchImpl).toHaveBeenCalledTimes(4);
        for (const [url, init] of fetchImpl.mock.calls) {
            expect(String(url).startsWith(DEFAULT_DATABASE_URL)).toBe(true);
            expect(init.method).toBeUndefined();
            expect(init.headers).toEqual({ accept: 'application/json' });
        }
    });

    it('reads nothing and writes nothing when the exchange fails', async () => {
        const fetchImpl = vi.fn(async () => jsonResponse({ error: 'denied' }, 403));
        await expect(run({ fetchImpl, appCheckDebugToken: 'debug-token' })).rejects.toThrow(
            /App Check token/
        );
        expect(fetchImpl).toHaveBeenCalledTimes(1);
        expect(await readdir(outDir)).toEqual([]);
    });
});
