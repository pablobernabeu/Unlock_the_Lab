import { describe, expect, it, vi } from 'vitest';
import { recordCount } from '../../../src/admin/counts.js';
import { databaseErrorKey } from '../../../src/admin/errors.js';
import { buildSnapshot, nodeCsv } from '../../../src/admin/files.js';
import { fetchNode, restBaseUrl, restNodeUrl } from '../../../src/admin/rest.js';

const PRODUCTION = 'https://unlock-the-lab-workshop-default-rtdb.europe-west1.firebasedatabase.app';

function jsonResponse(body, status = 200) {
    return new Response(typeof body === 'string' ? body : JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
    });
}

describe('REST URLs', () => {
    it('reads production from the configured database URL', () => {
        const base = restBaseUrl({ databaseURL: PRODUCTION });
        expect(restNodeUrl(base, 'ratings').href).toBe(`${PRODUCTION}/ratings.json`);
    });

    it('reads the emulator with the namespace taken from the database URL', () => {
        const base = restBaseUrl({
            databaseURL: PRODUCTION,
            emulatorOrigin: 'http://127.0.0.1:9000',
        });
        expect(restNodeUrl(base, 'sessions').href).toBe(
            'http://127.0.0.1:9000/sessions.json?ns=unlock-the-lab-workshop-default-rtdb'
        );
    });

    it('prefers an ns parameter in the database URL, as the SDK does', () => {
        const base = restBaseUrl({
            databaseURL: 'http://localhost:9000/?ns=fork-db',
            emulatorOrigin: 'http://127.0.0.1:9000',
        });
        expect(restNodeUrl(base, 'active').href).toBe(
            'http://127.0.0.1:9000/active.json?ns=fork-db'
        );
    });
});

describe('fetchNode', () => {
    const base = restBaseUrl({ databaseURL: PRODUCTION });

    it('returns the node as the server stores it, without a cached copy', async () => {
        const fetchImpl = vi.fn(async () => jsonResponse({ STUDY_1: true }));
        await expect(fetchNode(base, 'ratings', { fetchImpl })).resolves.toEqual({ STUDY_1: true });
        const [url, init] = fetchImpl.mock.calls[0];
        expect(String(url)).toBe(`${PRODUCTION}/ratings.json`);
        expect(init.cache).toBe('no-store');
    });

    it('returns null for an empty node', async () => {
        const fetchImpl = async () => jsonResponse('null');
        await expect(fetchNode(base, 'active', { fetchImpl })).resolves.toBeNull();
    });

    it('reports a refusal by the rules as one', async () => {
        const fetchImpl = async () => jsonResponse('{\n  "error" : "Permission denied"\n}\n', 401);
        const error = await fetchNode(base, 'ratings', { fetchImpl }).catch((caught) => caught);
        expect(error.message).toBe('Reading /ratings failed (HTTP 401): Permission denied');
        expect(databaseErrorKey(error)).toBe('admin.errors.permissionDenied');
    });

    it('reports other failures with the start of the body', async () => {
        const fetchImpl = async () => new Response('Service Unavailable', { status: 503 });
        await expect(fetchNode(base, 'ratings', { fetchImpl })).rejects.toThrow(
            'Reading /ratings failed (HTTP 503): Service Unavailable'
        );
    });

    // The Firebase SDK gives up on a node with a child named 'hasOwnProperty' and
    // reports it as empty; read over REST, such a node is exported in full.
    it('keeps every record when a key is named after an Object method', async () => {
        const record = { rating: 5, prediction: 4, timestamp: 1, uid: 'u' };
        const ratings = {
            'STUDY-5': {
                session_1700000000000_abc: record,
                hasOwnProperty: { ...record, rating: 7 },
                constructor: { ...record, rating: 3 },
            },
        };
        const fetchImpl = async () => jsonResponse(ratings);
        const value = await fetchNode(base, 'ratings', { fetchImpl });

        expect(recordCount('ratings', value)).toBe(3);
        expect(nodeCsv('ratings', value).trim().split('\n')).toHaveLength(4);
        const snapshot = buildSnapshot({ ratings: value }, { exportedAt: new Date(0) });
        expect(snapshot.counts.ratings).toBe(3);
        expect(snapshot.nodes.ratings).toEqual(ratings);
    });
});
