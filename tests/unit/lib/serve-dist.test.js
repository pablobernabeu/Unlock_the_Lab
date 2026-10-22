import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { headersFor, resolveFile, withEmulatorOrigins } from '../../../scripts/serve-dist.mjs';

let root;
let dist;

beforeAll(() => {
    // A build folder next to a sibling whose name starts with the same letters, as
    // dist/ and dist-e2e/ do in the repository.
    root = mkdtempSync(path.join(tmpdir(), 'serve-dist-'));
    dist = path.join(root, 'dist');
    mkdirSync(path.join(dist, 'assets'), { recursive: true });
    mkdirSync(path.join(root, 'dist-e2e'));
    writeFileSync(path.join(dist, 'index.html'), 'index');
    writeFileSync(path.join(dist, 'assets', 'app.js'), 'app');
    writeFileSync(path.join(root, 'dist-e2e', 'index.html'), 'sibling');
    writeFileSync(path.join(root, 'secret.txt'), 'secret');
});

afterAll(() => {
    rmSync(root, { recursive: true, force: true });
});

describe('resolveFile', () => {
    it('maps request paths to files in the build folder', async () => {
        expect(await resolveFile(dist, '/')).toBe(path.join(dist, 'index.html'));
        expect(await resolveFile(dist, '/assets/app.js')).toBe(path.join(dist, 'assets', 'app.js'));
    });

    it('returns null for missing files, folders and malformed escapes', async () => {
        expect(await resolveFile(dist, '/missing.html')).toBeNull();
        expect(await resolveFile(dist, '/assets')).toBeNull();
        expect(await resolveFile(dist, '/%E0%A4%A')).toBeNull();
    });

    it('never leaves the build folder, not even for a sibling with the same prefix', async () => {
        expect(await resolveFile(dist, '/..%2Fsecret.txt')).toBeNull();
        expect(await resolveFile(dist, '/..%2Fdist-e2e/index.html')).toBeNull();
        expect(await resolveFile(dist, '/..%2Fdist-e2e/')).toBeNull();
    });
});

describe('headers', () => {
    const rules = [
        { source: '**', headers: [{ key: 'Content-Security-Policy', value: 'default-src a' }] },
        { source: '/assets/**', headers: [{ key: 'Cache-Control', value: 'immutable' }] },
        { source: '**', headers: [{ key: 'Content-Security-Policy', value: 'default-src b' }] },
    ];

    it('applies every matching Hosting rule in order', () => {
        expect(headersFor('/assets/app.js', rules)).toEqual({
            'Content-Security-Policy': 'default-src b',
            'Cache-Control': 'immutable',
        });
        expect(headersFor('/index.html', rules)).toEqual({
            'Content-Security-Policy': 'default-src b',
        });
    });

    it('adds the emulator origins only to the directives that name Firebase hosts', () => {
        const policy = withEmulatorOrigins(
            "default-src 'self'; script-src 'self' https://x.firebasedatabase.app; connect-src 'self'"
        );
        expect(policy).toBe(
            "default-src 'self'; script-src 'self' https://x.firebasedatabase.app http://127.0.0.1:9000; " +
                "connect-src 'self' http://127.0.0.1:9000 ws://127.0.0.1:9000 http://127.0.0.1:9099"
        );
    });
});
