#!/usr/bin/env node
// Serves dist/ with the headers that firebase.json sets on Firebase Hosting, so
// end-to-end tests run under the production Content Security Policy.
//
//   node scripts/serve-dist.mjs [--port 4173] [--emulators]
//
// --emulators adds the local emulator origins to the directives that already
// name Firebase hosts, because a test build talks to 127.0.0.1 instead of
// *.firebasedatabase.app. Every other directive is served unchanged.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const DIST = path.join(ROOT, 'dist');

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.png': 'image/png',
    '.txt': 'text/plain; charset=utf-8',
    '.map': 'application/json; charset=utf-8',
};

const EMULATOR_ORIGINS = {
    'connect-src': ['http://127.0.0.1:9000', 'ws://127.0.0.1:9000', 'http://127.0.0.1:9099'],
    'script-src': ['http://127.0.0.1:9000'],
};

/** Converts a Firebase Hosting glob ('**', '*', literal paths) to a RegExp. */
export function globToRegExp(glob) {
    const pattern = glob
        .split('**')
        .map((part) =>
            part
                .split('*')
                .map((piece) => piece.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
                .join('[^/]*')
        )
        .join('.*');
    return new RegExp(`^${pattern.startsWith('/') ? '' : '/?'}${pattern}$`);
}

/** Headers for a request path, applying every matching rule in order as Hosting does. */
export function headersFor(urlPath, rules) {
    const headers = {};
    for (const rule of rules) {
        if (!globToRegExp(rule.source).test(urlPath)) continue;
        for (const { key, value } of rule.headers) headers[key] = value;
    }
    return headers;
}

/** Adds the emulator origins to the CSP directives listed in EMULATOR_ORIGINS. */
export function withEmulatorOrigins(csp) {
    return csp
        .split(';')
        .map((directive) => {
            const [name, ...sources] = directive.trim().split(/\s+/);
            const extra = EMULATOR_ORIGINS[name] ?? [];
            return [name, ...sources, ...extra].join(' ');
        })
        .join('; ');
}

async function resolveFile(urlPath) {
    const decoded = decodeURIComponent(urlPath);
    const candidate = path.join(DIST, decoded.endsWith('/') ? `${decoded}index.html` : decoded);
    if (!candidate.startsWith(DIST)) return null;
    try {
        const info = await stat(candidate);
        return info.isFile() ? candidate : null;
    } catch {
        return null;
    }
}

async function main() {
    const { values } = parseArgs({
        options: {
            port: { type: 'string', default: '4173' },
            emulators: { type: 'boolean', default: false },
        },
    });
    const config = JSON.parse(await readFile(path.join(ROOT, 'firebase.json'), 'utf8'));
    const rules = config.hosting.headers ?? [];

    const server = createServer(async (request, response) => {
        const urlPath = new URL(request.url, 'http://localhost').pathname;
        let file = await resolveFile(urlPath);
        let status = 200;
        if (!file) {
            file = path.join(DIST, '404.html');
            status = 404;
        }
        const headers = headersFor(status === 404 ? '/404.html' : urlPath, rules);
        const csp = headers['Content-Security-Policy'];
        if (csp && values.emulators) headers['Content-Security-Policy'] = withEmulatorOrigins(csp);
        headers['Content-Type'] = MIME_TYPES[path.extname(file)] ?? 'application/octet-stream';
        try {
            const body = await readFile(file);
            response.writeHead(status, headers);
            response.end(body);
        } catch {
            response.writeHead(500, { 'Content-Type': 'text/plain' });
            response.end('dist/ is missing; run the build first.');
        }
    });
    server.listen(Number(values.port), '127.0.0.1', () => {
        console.log(`Serving dist/ on http://127.0.0.1:${values.port}`);
    });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main();
}
