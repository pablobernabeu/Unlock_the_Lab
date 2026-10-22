#!/usr/bin/env node
// Serves a build folder with the headers that firebase.json sets on Firebase
// Hosting, so end-to-end tests run under the production Content Security Policy.
//
//   node scripts/serve-dist.mjs [--port 4173] [--emulators] [--dir <folder>]
//
// --emulators adds the local emulator origins to the directives that already
// name Firebase hosts, because a test build talks to 127.0.0.1 instead of
// *.firebasedatabase.app. Every other directive is served unchanged. It also
// changes the default folder from dist/ (the production build that Hosting
// publishes) to dist-e2e/ (test builds, see vite.config.js), so the emulator
// policy is never served with a production build.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

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

/**
 * The file a request path maps to inside `dist`, or null when there is none
 * or the path would leave the folder.
 * @param {string} dist absolute path of the build folder
 * @param {string} urlPath the request's path, still percent-encoded
 * @returns {Promise<string|null>}
 */
export async function resolveFile(dist, urlPath) {
    let decoded;
    try {
        decoded = decodeURIComponent(urlPath);
    } catch {
        // A malformed escape (say '/%E0') is a missing page, not a reason to stop the server.
        return null;
    }
    const candidate = path.join(dist, decoded.endsWith('/') ? `${decoded}index.html` : decoded);
    // The separator stops '/..%2Fdist-e2e/x' from reaching a sibling folder that shares the prefix.
    if (!candidate.startsWith(dist + path.sep)) return null;
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
            dir: { type: 'string' },
        },
    });
    const folder = values.dir ?? (values.emulators ? 'dist-e2e' : 'dist');
    const dist = path.resolve(ROOT, folder);
    const config = JSON.parse(await readFile(path.join(ROOT, 'firebase.json'), 'utf8'));
    const rules = config.hosting.headers ?? [];

    const server = createServer(async (request, response) => {
        const urlPath = new URL(request.url, 'http://localhost').pathname;
        let file = await resolveFile(dist, urlPath);
        let status = 200;
        if (!file) {
            file = path.join(dist, '404.html');
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
            response.end(`${folder}/ is missing; run the build first.`);
        }
    });
    server.listen(Number(values.port), '127.0.0.1', () => {
        console.log(`Serving ${folder}/ on http://127.0.0.1:${values.port}`);
    });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main();
}
